import React, { 
    useEffect, 
    useMemo, 
    useState, 
    useRef, 
    useReducer, 
    useCallback, 
    useContext 
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadReclamoImage, deleteReclamoImage } from '../utils/uploadImage';

import { 
    Card, 
    Button, 
    TextInput, 
    Textarea, 
    Select, 
    Checkbox, 
    Group, 
    Badge, 
    Box,
    Title,
    Text,
    ActionIcon,
    Alert,
    SimpleGrid,
    Container,
    Loader,
    Image
} from '@mantine/core';


import { 
    IconThumbUp, 
    IconPencil, 
    IconTrash, 
    IconArrowsLeftRight, 
    IconMessageCircle,
    IconClock,
    IconAlertCircle,
    IconUpload,
    IconCategory,
    IconMapPin,
    IconSearch,
    IconSend,
    IconChartBar,
    IconCheck,
    IconX,
    IconArrowUp,
    IconFileLike 
} from '@tabler/icons-react';


import { db, initAuth, appId } from '../firebase/config';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    increment,
    arrayUnion
} from 'firebase/firestore';



const CONFIG = {

    PAGE_SIZE: 6,

    CATEGORIES: ["Servicios Públicos", "Seguridad", "Transporte", "Salud", "Educación", "Ambiente", "Otros"],
    MAX_IMAGE_SIZE_BYTES: 1024 * 1024
};



const utils = {
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    nowISO: () => new Date().toISOString(),
    
    downloadFile: (filename, text, mimeType) => {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    toCSV: (data) => {
        const escapeCSV = (value) => `"${(value || "").replace(/"/g, '""')}"`;
        const header = ["id", "title", "category", "location", "status", "votes", "createdAt", "updatedAt", "comments_count", "has_image"];
        const rows = data.map(c => [
            c.id, escapeCSV(c.title), escapeCSV(c.category), escapeCSV(c.location), 
            c.status || "", c.votes || 0, c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : '', 
            c.updatedAt?.toDate ? c.updatedAt.toDate().toISOString() : '', 
            (c.comments || []).length, c.imageFileRef ? "yes" : "no" 
        ].join(","));
        return [header.join(","), ...rows].join("\n");
    }
};




const useToast = () => {
    const [toast, setToast] = useState(null);
    const timerRef = useRef(null);

    const pushToast = useCallback((msg, timeout = 3000) => {
        clearTimeout(timerRef.current);
        setToast(msg);
        timerRef.current = setTimeout(() => setToast(null), timeout);
    }, []);

    return [toast, pushToast];
};



const initialFormState = {
    id: null, title: "", category: CONFIG.CATEGORIES[0], location: "", 
    description: "", anonymous: false, 
    image: null, 
    imageFileRef: null 
};

const formReducer = (state, action) => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'SET_FORM':
            return { ...initialFormState, ...action.payload };
        case 'RESET':
            if (state.image && state.image.startsWith('blob:')) {
            }
            return initialFormState; 
        default:
            return state;
    }
};



const ComplaintContext = React.createContext();

export const useComplaintContext = () => {
    const context = useContext(ComplaintContext);
    if (!context) {
        throw new Error('useComplaintContext must be used within a ComplaintProvider');
    }
    return context;
};



const ComplaintProvider = ({ children }) => {

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, dispatchForm] = useReducer(formReducer, initialFormState);
    const [filters, setFilters] = useState({ 
        search: "", 
        category: "Todas las categorías",
        status: "Todos los estados", 
        sortBy: "fecha_desc" 
    });
    const [ui, setUi] = useState({ 
        isAdmin: false, 
        pageSize: CONFIG.PAGE_SIZE, 
        page: 1, 
        showStats: false 
    });
    const [toast, pushToast] = useToast();
    const voteTimestamps = useRef({});



    useEffect(() => {
        const initialize = async () => {
            await initAuth();
            
            const collectionPath = `artifacts/${appId}/public/data/complaints`;
            const complaintsCollection = collection(db, collectionPath);
            

            const q = query(complaintsCollection, orderBy("createdAt", "desc"));


            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const complaintsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setComplaints(complaintsList);
                setLoading(false);
            }, (error) => {
                console.error("Error al escuchar los reclamos:", error);
                setLoading(false);
            });


            return () => unsubscribe();
        };

        initialize();
    }, []);



    const collectionPath = `artifacts/${appId}/public/data/complaints`;

    const enableAdmin = useCallback(() => {
        setUi(prev => ({ ...prev, isAdmin: !prev.isAdmin }));
        pushToast(ui.isAdmin ? "❌ Modo administrador desactivado" : "✅ Modo administrador activado");
    }, [ui.isAdmin, pushToast]);

    const onFilterChange = useCallback((field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setUi(prev => ({ ...prev, page: 1 })); 
    }, []);

    const complaintActions = useMemo(() => ({

save: async (e) => {
    e?.preventDefault();
    
    if (!form.title.trim() || form.title.length > 100) {
        return pushToast("❌ Título obligatorio (máx 100 caracteres)");
    }
    if (!form.description.trim() || form.description.length > 1000) {
        return pushToast("❌ Descripción obligatoria (máx 1000 caracteres)");
    }

    try {
        pushToast("⏳ Guardando reclamo...");


        const complaintToSave = {
            title: form.title,
            category: form.category,
            location: form.location,
            description: form.description,
            anonymous: form.anonymous,
            updatedAt: serverTimestamp(),
        };

        if (form.id) {

            const docRef = doc(db, collectionPath, form.id);
            

            if (form.image && form.image.startsWith('data:')) {

                const response = await fetch(form.image);
                const blob = await response.blob();
                const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                

                const imageData = await uploadReclamoImage(file, form.id);
                complaintToSave.imageUrl = imageData.url;
                complaintToSave.imagePath = imageData.path;
            }
            
            await updateDoc(docRef, complaintToSave);
            pushToast("✅ Reclamo actualizado con éxito");
            
        } else {

            

            const tempId = `temp_${Date.now()}`;
            

            if (form.image && form.image.startsWith('data:')) {
                const response = await fetch(form.image);
                const blob = await response.blob();
                const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                
                const imageData = await uploadReclamoImage(file, tempId);
                complaintToSave.imageUrl = imageData.url;
                complaintToSave.imagePath = imageData.path;
            }
            

            await addDoc(collection(db, collectionPath), {
                ...complaintToSave,
                status: "Abierto",
                votes: 0,
                votadoPor: [],
                comments: [],
                createdAt: serverTimestamp(),
            });
            
            pushToast("🚀 Reclamo publicado con éxito");
        }
        
        dispatchForm({ type: 'RESET' });
        
    } catch (error) {
        console.error("Error al guardar el reclamo:", error);
        pushToast("❌ Error: " + (error.message || "No se pudo guardar"));
    }
},
        
        onImageChange: (file) => {

            if (!file) {
                return dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
            }
            if (file.size > CONFIG.MAX_IMAGE_SIZE_BYTES) {
                pushToast(`❌ El archivo es muy grande. Máximo: ${CONFIG.MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`);
                return dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                dispatchForm({ type: 'SET_FIELD', field: 'image', value: e.target.result });
            };
            reader.readAsDataURL(file);
        },

        onEdit: (complaint) => {

            dispatchForm({ type: 'SET_FORM', payload: complaint });
            pushToast(`✏️ Editando reclamo: ${complaint.title}`);
        },

        onVote: async (id) => {
            const lastVote = voteTimestamps.current[id] || 0;
            if (Date.now() - lastVote < 60000) { 
                return pushToast("⏳ Debes esperar 1 minuto para votar de nuevo.");
            }

            try {
                const docRef = doc(db, collectionPath, id);
                await updateDoc(docRef, {
                    votes: increment(1)
                });
                voteTimestamps.current[id] = Date.now(); 
                pushToast("👍 Voto registrado.");
            } catch (error) {
                console.error("Error al votar:", error);
                pushToast("❌ Error al registrar el voto.");
            }
        },

        onToggleStatus: async (id, currentStatus) => {

    const statusCycle = {
        "Abierto": "En Proceso",
        "En Proceso": "Resuelto",
        "Resuelto": "Abierto"
    };
    
    const newStatus = statusCycle[currentStatus] || "Abierto";
    
    try {
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        pushToast(`🔄 Estado cambiado a: ${newStatus}`);
    } catch (error) {
        console.error("Error al cambiar estado:", error);
        pushToast("❌ Error al cambiar el estado.");
    }
},

        onAddComment: async (id, text) => {
            if (!text.trim()) return;
            const newComment = {
                id: utils.uid(),
                text,
                createdAt: serverTimestamp()
            };
            try {
                const docRef = doc(db, collectionPath, id);
                await updateDoc(docRef, {
                    comments: arrayUnion(newComment)
                });
                pushToast("💬 Comentario añadido.");
            } catch (error) {
                console.error("Error al comentar:", error);
                pushToast("❌ Error al añadir comentario.");
            }
        },

        onDelete: async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este reclamo permanentemente?')) {
        return;
    }
    
    try {

        const complaint = complaints.find(c => c.id === id);
        

        if (complaint?.imagePath) {
            await deleteReclamoImage(complaint.imagePath);
        }
        

        const docRef = doc(db, collectionPath, id);
        await deleteDoc(docRef);
        
        pushToast("🗑️ Reclamo eliminado permanentemente.");
    } catch (error) {
        console.error("Error al eliminar:", error);
        pushToast("❌ Error al eliminar el reclamo.");
    }
},


        
        onExport: () => {

            utils.downloadFile(`reclamos_${utils.nowISO()}.csv`, utils.toCSV(complaints), "text/csv");
            pushToast("💾 Datos exportados a CSV.");
        }
    }), [form, pushToast, complaints, collectionPath]);


    
    const filteredAndSortedComplaints = useMemo(() => {
        let result = complaints;
        const { search, category, status, sortBy } = filters;
        
        result = result.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                                  c.description.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = category === "Todas las categorías" || c.category === category;
            const matchesStatus = status === "Todos los estados" || c.status === status;
            return matchesSearch && matchesCategory && matchesStatus;
        });


        result.sort((a, b) => {
            switch (sortBy) {
                case "fecha_asc":
                    return a.createdAt?.toDate() - b.createdAt?.toDate();
                case "votos":
                    return (b.votes || 0) - (a.votes || 0);
                case "fecha_desc":
                default:
                    return b.createdAt?.toDate() - a.createdAt?.toDate();
            }
        });
        
        return result;
    }, [complaints, filters]);
    
    const totalPages = Math.ceil(filteredAndSortedComplaints.length / ui.pageSize);
    const startIndex = (ui.page - 1) * ui.pageSize;
    const paginatedComplaints = filteredAndSortedComplaints.slice(startIndex, startIndex + ui.pageSize);
    
    const stats = useMemo(() => ({
        total: complaints.length,
        open: complaints.filter(c => c.status === 'Abierto').length,
        resolved: complaints.filter(c => c.status === 'Resuelto').length,
        totalVotes: complaints.reduce((sum, c) => sum + (c.votes || 0), 0)
    }), [complaints]);



    const contextValue = useMemo(() => ({

        complaints,
        loading,
        form,
        dispatchForm,
        filters,
        setFilters: onFilterChange, 
        ui,
        setUi,
        toast,
        pushToast,
        enableAdmin,
        complaintActions,
        paginatedComplaints,
        totalPages,
        stats
    }), [complaints, loading, form, filters, ui, toast, pushToast, enableAdmin, complaintActions, paginatedComplaints, totalPages, stats, onFilterChange]);

    return (
        <ComplaintContext.Provider value={contextValue}>
            {children}
        </ComplaintContext.Provider>
    );
};






const Toast = () => {
    const { toast } = useComplaintContext();
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1000,
                        maxWidth: 300
                    }}
                >
                    <Alert 
                        variant="filled" 
                        color="teal" 
                        icon={<IconAlertCircle size={20} />} 
                        radius="md"
                    >
                        {toast}
                    </Alert>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


const CommentBox = ({ complaintId }) => {
    const { complaintActions } = useComplaintContext();
    const [txt, setTxt] = useState("");
    
    return (
        <Group wrap="nowrap" mt="md" w="100%">
            <Textarea 
                value={txt} 
                onChange={e => setTxt(e.target.value)} 
                placeholder="Escribe un comentario..." 
                minRows={1}
                maxRows={4}
                maxLength={500}
                size="md"
                radius="lg"
                style={{ flexGrow: 1 }}
                autosize
            />
            <Button 
                onClick={() => { 
                    if (txt.trim()) {
                        complaintActions.onAddComment(complaintId, txt); 
                        setTxt(""); 
                    }
                }} 
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan', deg: 105 }}
                size="md"
                radius="lg"
                leftSection={<IconSend size={18} />}
                disabled={!txt.trim()}
            >
                Enviar
            </Button>
        </Group>
    );
};

const FilterRow = () => {
    const { filters, setFilters, complaintActions } = useComplaintContext();
    const categoryOptions = [{ value: "Todas las categorías", label: "Todas las categorías" }, ...CONFIG.CATEGORIES.map(c => ({ value: c, label: c }))];
    const statusOptions = [{ value: "Todos los estados", label: "Todos los estados" }, { value: "Abierto", label: "Abierto" }, { value: "Resuelto", label: "Resuelto" }];
    const sortOptions = [
        { value: "fecha_desc", label: "📅 Más reciente" },
        { value: "fecha_asc", label: "📅 Más antiguo" },
        { value: "votos", label: "👍 Más votados" }
    ];

    return (
        <Group align="flex-end" wrap="wrap" w="100%">
            <TextInput 
                leftSection={<IconSearch size={18} />}
                placeholder="Buscar en reclamos..." 
                value={filters.search} 
                onChange={e => setFilters('search', e.target.value)} 
                size="lg"
                style={{ flexGrow: 1, minWidth: '200px' }} 
            />
            
            <Select 
                placeholder="Categoría"
                data={categoryOptions}
                value={filters.category} 
                onChange={value => setFilters('category', value)} 
                size="lg"
                style={{ minWidth: '180px' }}
            />
            
            <Select 
                placeholder="Estado"
                data={statusOptions}
                value={filters.status} 
                onChange={value => setFilters('status', value)} 
                size="lg"
                style={{ minWidth: '180px' }}
            />
            
            <Select 
                placeholder="Ordenar por"
                data={sortOptions}
                value={filters.sortBy} 
                onChange={value => setFilters('sortBy', value)} 
                size="lg"
                style={{ minWidth: '180px' }}
            />
            
            <Group gap="xs">
                {/*

                <ActionIcon 
                    variant="default" 
                    size="lg" 
                    onClick={() => complaintActions.onExport('JSON')}
                    title="Exportar a JSON"
                >
                    <IconFileLike size={20} color="orange" />
                </ActionIcon> 
                */}
                <ActionIcon 
                    variant="default" 
                    size="lg" 
                    onClick={() => complaintActions.onExport('CSV')}
                    title="Exportar a CSV"
                >
                    <IconFileLike size={20} color="green" />
                </ActionIcon>
            </Group>
        </Group>
    );
};




const ComplaintForm = () => { 

    const { form, dispatchForm, complaintActions, pushToast } = useComplaintContext();
    const setField = (field, value) => dispatchForm({ type: 'SET_FIELD', field, value });
    const categoryOptions = CONFIG.CATEGORIES.map(c => ({ value: c, label: c }));

    const handleImageChange = (file) => {
        if (!file) {
            dispatchForm({ type: 'SET_FIELD', field: 'image', value: null }); 
            return;
        }

        if (file.size > CONFIG.MAX_IMAGE_SIZE_BYTES) {
            pushToast(`❌ El archivo es muy grande. Máximo: ${CONFIG.MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`);
            dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
            return;
        }
        
        complaintActions.onImageChange(file);
    };

    return (
        <motion.form 
            onSubmit={complaintActions.save}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card 
                shadow="xl" 
                padding="xl" 
                radius="lg" 
                withBorder 
                style={{ backgroundColor: 'var(--mantine-color-body)', opacity: 0.95 }}
            >
                <Title order={2} mb="lg" ta="center">
                    {form.id ? "✏️ Editando Reclamo" : "📝 Crear Nuevo Reclamo"}
                </Title>
                
                <div className="space-y-6">
                    
                    <TextInput 
                        label="¿Cuál es el problema? *"
                        placeholder="Ej: Semáforo roto en Av. Principal"
                        value={form.title} 
                        onChange={e => setField('title', e.target.value)}
                        maxLength={100}
                        size="lg"
                        rightSection={<Text size="sm" c="dimmed">{form.title.length}/100</Text>}
                        required
                    />

                    <Select 
                        label="Categoría *"
                        placeholder="Selecciona una categoría"
                        data={categoryOptions}
                        value={form.category} 
                        onChange={value => setField('category', value)} 
                        size="lg"
                        leftSection={<IconCategory size={18} />}
                        required
                    />

                    <Group grow align="flex-end">
                        <TextInput 
                            label="📍 Ubicación (Opcional)"
                            placeholder="Ej: Esquina de Calle Falsa 123"
                            value={form.location} 
                            onChange={e => setField('location', e.target.value)}
                            leftSection={<IconMapPin size={18} />}
                        />
                        
                        <Checkbox
                            label="Publicar como Anónimo" 
                            checked={form.anonymous} 
                            onChange={e => setField('anonymous', e.target.checked)}
                            size="md"
                        />
                    </Group>

                    <Textarea 
                        label="Describe el problema en detalle... *"
                        placeholder="✍️ Proporciona detalles específicos para ayudar a solucionarlo."
                        value={form.description} 
                        onChange={e => setField('description', e.target.value)}
                        rows={4}
                        maxLength={1000}
                        rightSection={<Text size="sm" c="dimmed" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>{form.description.length}/1000</Text>}
                        required
                    />
                    
                    <Box>
                        <Text size="sm" mb={4}>📸 Adjuntar Imagen (Evidencia - Máx 1MB)</Text>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={e => handleImageChange(e.target.files[0])}
                            style={{
                                display: 'block', 
                                width: '100%', 
                                padding: '12px', 
                                border: '1px solid var(--mantine-color-gray-3)', 
                                borderRadius: '8px',
                                background: 'var(--mantine-color-body)'
                            }}
                        />
                    </Box>
                    
                    {form.image && (
                        <Alert 
                            variant="light" 
                            color="teal" 
                            title="Imagen Cargada (Vista Previa)" 
                            icon={<IconUpload size={20} />} 
                            radius="md"
                            withCloseButton
                            onClose={() => handleImageChange(null)} 
                        >
                            <Group>
                                <img 
                                    src={form.image} 
                                    alt="Vista previa" 
                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                                <Text size="sm">Se usará esta imagen al publicar/guardar.</Text>
                            </Group>
                        </Alert>
                    )}

                    <Group justify="flex-end" pt="md">
                        {form.id && (
                            <Button 
                                variant="subtle" 
                                color="gray"
                                onClick={() => dispatchForm({ type: 'RESET' })} 
                            >
                                Cancelar
                            </Button>
                        )}
                        <Button 
                            type="submit" 
                            variant="filled"
                            color="blue"
                            size="lg"
                        >
                            {form.id ? "💾 Guardar Cambios" : "🚀 Publicar Reclamo"}
                        </Button>
                    </Group>
                </div>
            </Card>
        </motion.form>
    );
};


const StatsPanel = () => {
    const { stats, ui } = useComplaintContext();
    
    const dataCards = [
        { title: "Total de Reclamos", value: stats.total.toString(), icon: IconChartBar, color: 'blue', description: 'Total de reclamos creados.' },
        { title: "Reclamos Abiertos", value: stats.open.toString(), icon: IconX, color: 'red', description: 'Esperando solución o respuesta.' },
        { title: "Reclamos Resueltos", value: stats.resolved.toString(), icon: IconCheck, color: 'green', description: 'Problemas que han sido solucionados.' },
        { title: "Votos Totales", value: stats.totalVotes.toString(), icon: IconArrowUp, color: 'pink', description: 'Apoyo total de la comunidad.' }
    ];


return (<AnimatePresence>{ui.isAdmin && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: '24px' }}
                >
                    <Title order={2} ta="center" my="xl">Estadísticas Comunitarias</Title>
                    <SimpleGrid 
                        cols={{ base: 1, sm: 2, lg: 4 }} 
                        spacing="lg" 
                        verticalSpacing="lg"
                    >
                        {dataCards.map((item) => (
                            <Card key={item.title} shadow="md" padding="xl" radius="lg" withBorder>
                                <Group justify="space-between">
                                    <Text size="lg" fw={500} c="dimmed">{item.title}</Text>
                                    <item.icon size={30} style={{ color: `var(--mantine-color-${item.color}-6)` }} />
                                </Group>

                                <Text size="xl" fw={700} mt="md" mb="xs">{item.value}</Text>
                                <Text size="sm" c="dimmed">{item.description}</Text>
                            </Card>
                        ))}
                    </SimpleGrid>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ComplaintsList = () => {

    const { paginatedComplaints, loading } = useComplaintContext();


    if (loading) {
        return (
            <Group justify="center" mt="xl" p="xl">
                <Loader color="blue" size="lg" />
                <Text>Cargando reclamos...</Text>
            </Group>
        );
    }

    return (
        <div className="space-y-6">
            <Title order={2} ta="center" my="xl">Reclamos de la Comunidad</Title>
            <AnimatePresence initial={false}>
                {paginatedComplaints.length === 0 ? (
                    <motion.div 
                        key="empty"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center py-10"
                    >
                        <Title order={3} c="dimmed">0 reclamos encontrados</Title>
                        <Text c="dimmed" mt="xs">No hay reclamos que coincidan con los filtros.</Text>
                        <Text c="dimmed">¡Sé el primero en crear un reclamo!</Text>
                    </motion.div>
                ) : (
                    paginatedComplaints.map((c, index) => (
                        <ComplaintCard 
                            key={c.id} 
                            complaint={c} 
                            index={index}
                        />
                    ))
                )}
            </AnimatePresence>
        </div>
    );
};

const ComplaintCard = ({ complaint: c, index }) => {
    const { ui, complaintActions } = useComplaintContext();
    const isAdmin = ui.isAdmin;
    
    const [showComments, setShowComments] = useState(false);

    const statusMap = {
    "Abierto": { color: 'red', text: '🔴 Abierto' },
    "En Proceso": { color: 'blue', text: '🔵 En Proceso' },
    "Resuelto": { color: 'green', text: '✅ Resuelto' },
    "Rechazado": { color: 'gray', text: '⛔ Rechazado' }
};
    const currentStatus = statusMap[c.status] || { color: 'gray', text: c.status };


    const formatTime = (firebaseTimestamp) => {
        if (!firebaseTimestamp?.toDate) {
            return "fecha inválida";
        }
        const date = firebaseTimestamp.toDate();
        return date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            <Card shadow="md" padding="lg" radius="lg" withBorder>
                <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                        <Badge color={currentStatus.color} size="lg" radius="sm">
                            {currentStatus.text}
                        </Badge>
                        <Badge variant="light" color="blue" size="lg" radius="sm">
                            {c.category}
                        </Badge>
                        <Text size="sm" c="dimmed">
                            {c.anonymous ? 'Anónimo' : 'Público'}
                        </Text>
                    </Group>
                    <Text size="sm" c="dimmed" fs="italic">
                      <IconClock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Publicado: {formatTime(c.createdAt)}
                    </Text>
                </Group>

                <Title order={3} my="sm">{c.title}</Title>
                <Text size="md" mb="md" style={{ whiteSpace: 'pre-wrap' }}>{c.description}</Text>
                
                {c.imageUrl && (
    <Box mb="md">
        <Image
            src={c.imageUrl}
            alt="Evidencia del reclamo"
            radius="md"
            height={300}
            fit="cover"
            style={{ cursor: 'pointer' }}
            onClick={() => window.open(c.imageUrl, '_blank')}
        />
        <Text size="xs" c="dimmed" mt="xs" ta="center">
            Click para ver en tamaño completo
        </Text>
    </Box>
)}

                <Group justify="space-between" mt="md" wrap="nowrap">
                    <Group>
                        <Button 
                            leftSection={<IconThumbUp size={18} />} 
                            onClick={() => complaintActions.onVote(c.id)}
                            variant="light"
                            color="pink"
                            size="md"
                        >
                            Votar ({c.votes || 0})
                        </Button>
                        <Button 
                            leftSection={<IconMessageCircle size={18} />} 
                            onClick={() => setShowComments(!showComments)}
                            variant="subtle"
                            color="gray"
                            size="md"
                        >
                            Comentarios ({c.comments?.length || 0})
                        </Button>
                    </Group>

                    {isAdmin && (
                        <Group>
                            <ActionIcon 
                                variant="light" 
                                color="orange" 
                                size="lg" 
                                onClick={() => complaintActions.onEdit(c)}
                                title="Editar"
                            >
                                <IconPencil size={20} />
                            </ActionIcon>
                            <ActionIcon 
                                variant="light" 
                                color="teal" 
                                size="lg" 
                                onClick={() => complaintActions.onToggleStatus(c.id, c.status)}
                                title={c.status === "Abierto" ? "Marcar Resuelto" : "Marcar Abierto"}
                            >
                                <IconArrowsLeftRight size={20} />
                            </ActionIcon>
                            <ActionIcon 
                                variant="light" 
                                color="red" 
                                size="lg" 
                                onClick={() => complaintActions.onDelete(c.id)}
                                title="Eliminar"
                            >
                                <IconTrash size={20} />
                            </ActionIcon>
                        </Group>
                    )}
                </Group>

                <AnimatePresence>
                    {showComments && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--mantine-color-gray-3)' }}
                        >
                            {c.comments?.length > 0 ? (
                                c.comments.map((comment) => (
                                    <Text key={comment.id} size="sm" mt="xs" style={{ borderLeft: '3px solid var(--mantine-color-blue-3)', paddingLeft: '8px' }}>
                                        <Badge color="gray" mr="xs" size="xs" variant="outline">{formatTime(comment.createdAt)}</Badge>
                                        {comment.text}
                                    </Text>
                                ))
                            ) : (
                                <Text size="sm" c="dimmed">Aún no hay comentarios. ¡Sé el primero!</Text>
                            )}
                            <CommentBox complaintId={c.id} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

const Pagination = () => {
    const { ui, setUi, totalPages } = useComplaintContext();
    const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => i + start);
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= 1) return null;

    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else if (ui.page <= Math.ceil(maxPagesToShow / 2)) {
        startPage = 1;
        endPage = maxPagesToShow;
    } else if (ui.page + Math.floor(maxPagesToShow / 2) >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
    } else {
        startPage = ui.page - Math.floor(maxPagesToShow / 2);
        endPage = ui.page + Math.floor(maxPagesToShow / 2);
    }

    const pages = range(startPage, endPage);

    return (
        <Group justify="center" my="xl">
            <Button 
                variant="default"
                disabled={ui.page === 1}
                onClick={() => setUi(prev => ({ ...prev, page: prev.page - 1 }))}
            >
                Anterior
            </Button>

            {startPage > 1 && (
                <>
                    <Button variant={ui.page === 1 ? 'filled' : 'default'} onClick={() => setUi(prev => ({ ...prev, page: 1 }))}>1</Button>
                    {startPage > 2 && <Text>...</Text>}
                </>
            )}

            {pages.map(p => (
                <Button 
                    key={p} 
                    variant={ui.page === p ? 'filled' : 'default'}
                    onClick={() => setUi(prev => ({ ...prev, page: p }))}
                >
                    {p}
                </Button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <Text>...</Text>}
                    <Button variant={ui.page === totalPages ? 'filled' : 'default'} onClick={() => setUi(prev => ({ ...prev, page: totalPages }))}>{totalPages}</Button>
                </>
            )}

            <Button 
                variant="default"
                disabled={ui.page === totalPages}
                onClick={() => setUi(prev => ({ ...prev, page: prev.page + 1 }))}
            >
                Siguiente
            </Button>
        </Group>
    );
};




function AppContent() {
    const { enableAdmin, ui } = useComplaintContext();


    return (

        <Container size="xl" mt="md">
            {/* <Header />  (Eliminado) */}
            <ComplaintForm />
            <StatsPanel />
            
            <Box mt="xl">
                <FilterRow />
            </Box>
            
            <ComplaintsList />
            <Pagination />
            
            {/* <DeletedQueue /> (Eliminado) */}
            <Toast />
            <Group justify="center" mt="xl" mb="xl">
  <Button
    variant="outline"
    color={ui.isAdmin ? 'red' : 'gray'}
    onClick={enableAdmin}
  >
    {ui.isAdmin ? 'Desactivar Modo Admin' : 'Activar Modo Admin'}
  </Button>
</Group>
            <footer className="text-center mt-12 pt-4 border-t border-gray-200">
                <Text size="sm" c="dimmed">
                    Hecho con amor para la comunidad. Foro de Reclamos Comunal - Tu voz importa
                </Text>
            </footer>
        </Container>
    );
}


export default function ForoReclamosComuna() {
    return ( 
        <ComplaintProvider>
            <AppContent />
        </ComplaintProvider>
    );
}