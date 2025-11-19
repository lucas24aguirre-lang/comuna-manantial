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
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db, initAuth, appId } from '../firebase/config';
import { PasswordInput, Modal, Card, Button, TextInput, Textarea, Select, Checkbox, Group, Badge, Box, Title, Text, ActionIcon, Alert, SimpleGrid, Container, Loader, Image, FileInput, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
    IconThumbUp, IconPencil, IconTrash, IconArrowsLeftRight, IconMessageCircle, 
    IconClock, IconAlertCircle, IconUpload, IconCategory, IconMapPin, 
    IconSearch, IconSend, IconChartBar, IconCheck, IconX, IconArrowUp, IconFileLike 
} from '@tabler/icons-react';
import { 
    collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, 
    deleteDoc, serverTimestamp, increment, arrayUnion 
} from 'firebase/firestore';

// Configuración general y constantes del sistema
const CONFIG = {
    PAGE_SIZE: 6,
    CATEGORIES: ["Servicios Públicos", "Seguridad", "Transporte", "Salud", "Educación", "Ambiente", "Otros"],
    MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024  // 5MB
};

// Email autorizado para funciones administrativas
const ADMIN_EMAIL = "lucas24aguirre@gmail.com"; 

const utils = {
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    nowISO: () => new Date().toISOString(),
    
    // Genera y descarga un archivo CSV en el cliente
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

    // Convierte los datos de reclamos a formato CSV
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

// Custom hook para manejo de notificaciones tipo Toast
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
    description: "", anonymous: false, image: null, imageFileRef: null 
};

const formReducer = (state, action) => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'SET_FORM':
            return { ...initialFormState, ...action.payload };
        case 'RESET':
            return initialFormState; 
        default:
            return state;
    }
};

const ComplaintContext = React.createContext();

export const useComplaintContext = () => {
    const context = useContext(ComplaintContext);
    if (!context) throw new Error('useComplaintContext must be used within a ComplaintProvider');
    return context;
};

const ComplaintProvider = ({ children }) => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, dispatchForm] = useReducer(formReducer, initialFormState);
    const [filters, setFilters] = useState({ 
        search: "", category: "Todas las categorías", status: "Todos los estados", sortBy: "fecha_desc" 
    });
    const [ui, setUi] = useState({ 
        isAdmin: false, pageSize: CONFIG.PAGE_SIZE, page: 1, showStats: false 
    });
    const [toast, pushToast] = useToast();
    const voteTimestamps = useRef({});

    // Inicialización de Auth y Listeners de Firestore
    useEffect(() => {
        const initialize = async () => {
            await initAuth();

            // Verificación de permisos de administrador
            const unsubscribeAuth = auth.onAuthStateChanged(user => {
                if (user && user.email === ADMIN_EMAIL) {
                    setUi(prev => ({ ...prev, isAdmin: true }));
                } else {
                    setUi(prev => ({ ...prev, isAdmin: false }));
                }
            });

            // Listener en tiempo real para los reclamos
            const collectionPath = `artifacts/${appId}/public/data/complaints`;
            const complaintsCollection = collection(db, collectionPath);
            const q = query(complaintsCollection, orderBy("createdAt", "desc"));

            const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
                const complaintsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setComplaints(complaintsList);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching data:", error);
                setLoading(false);
            });

            return () => {
                unsubscribeAuth();
                unsubscribeSnapshot();
            };
        };

        initialize();
    }, []);

    const collectionPath = `artifacts/${appId}/public/data/complaints`;

    const onFilterChange = useCallback((field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setUi(prev => ({ ...prev, page: 1 })); 
    }, []);

    const complaintActions = useMemo(() => ({
        save: async (e) => {
            e?.preventDefault();
            
            if (!form.title.trim() || form.title.length > 100) return pushToast("⌛ Título obligatorio (máx 100 caracteres)");
            if (!form.description.trim() || form.description.length > 1000) return pushToast("⌛ Descripción obligatoria (máx 1000 caracteres)");

            try {
                pushToast("⏳ Procesando solicitud...");

                const complaintToSave = {
                    title: form.title,
                    category: form.category,
                    location: form.location,
                    description: form.description,
                    anonymous: form.anonymous,
                    updatedAt: serverTimestamp(),
                };

                // Lógica para manejo de imagen y guardado/actualización
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
                console.error("Error saving complaint:", error);
                pushToast("⌛ Error: " + (error.message || "No se pudo guardar"));
            }
        },
        
        onImageChange: (file) => {
            if (!file) return dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
            if (file.size > CONFIG.MAX_IMAGE_SIZE_BYTES) {
                pushToast(`⌛ Archivo excede el límite de ${CONFIG.MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`);
                return dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
            }
            const reader = new FileReader();
            reader.onload = (e) => dispatchForm({ type: 'SET_FIELD', field: 'image', value: e.target.result });
            reader.readAsDataURL(file);
        },

        onEdit: (complaint) => {
            dispatchForm({ type: 'SET_FORM', payload: complaint });
            pushToast(`✏️ Editando: ${complaint.title}`);
        },

        onVote: async (id) => {
            // Debounce simple para evitar spam de votos
            const lastVote = voteTimestamps.current[id] || 0;
            if (Date.now() - lastVote < 60000) return pushToast("⏳ Espera 1 minuto para votar nuevamente.");

            try {
                await updateDoc(doc(db, collectionPath, id), { votes: increment(1) });
                voteTimestamps.current[id] = Date.now(); 
                pushToast("👍 Voto registrado.");
            } catch (error) {
                console.error("Vote error:", error);
            }
        },

        onToggleStatus: async (id, currentStatus) => {
            const statusCycle = { "Abierto": "En Proceso", "En Proceso": "Resuelto", "Resuelto": "Abierto" };
            const newStatus = statusCycle[currentStatus] || "Abierto";
            try {
                await updateDoc(doc(db, collectionPath, id), { status: newStatus, updatedAt: serverTimestamp() });
                pushToast(`🔄 Nuevo estado: ${newStatus}`);
            } catch (error) {
                console.error("Status update error:", error);
            }
        },

        onAddComment: async (id, text) => {
    if (!text.trim()) return;
    try {
        const currentUser = auth.currentUser;
        
        const newComment = {
            id: utils.uid(),
            text,
            createdAt: new Date(), 
            user: {
                uid: currentUser?.uid || 'anonymous',
                email: currentUser?.email || null,
                displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario Anónimo',
                isAdmin: currentUser?.email === ADMIN_EMAIL
            }
        };
        
        await updateDoc(doc(db, collectionPath, id), {
            comments: arrayUnion(newComment)
        });
        
        pushToast("💬 Comentario añadido.");
    } catch (error) {
        console.error("Comment error:", error);
        pushToast("❌ Error al comentar");
    }
},

        onDelete: async (id) => {
            if (!window.confirm('¿Confirmar eliminación permanente?')) return;
            try {
                const complaint = complaints.find(c => c.id === id);
                if (complaint?.imagePath) await deleteReclamoImage(complaint.imagePath);
                await deleteDoc(doc(db, collectionPath, id));
                pushToast("🗑️ Reclamo eliminado.");
            } catch (error) {
                console.error("Delete error:", error);
            }
        },
        
        onExport: () => {
            utils.downloadFile(`reclamos_${utils.nowISO()}.csv`, utils.toCSV(complaints), "text/csv");
            pushToast("💾 Exportación completada.");
        }
    }), [form, pushToast, complaints, collectionPath]);
    
    // Filtrado y ordenamiento en cliente
    const filteredAndSortedComplaints = useMemo(() => {
        let result = complaints.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(filters.search.toLowerCase()) || 
                                  c.description.toLowerCase().includes(filters.search.toLowerCase());
            const matchesCategory = filters.category === "Todas las categorías" || c.category === filters.category;
            const matchesStatus = filters.status === "Todos los estados" || c.status === filters.status;
            return matchesSearch && matchesCategory && matchesStatus;
        });

        result.sort((a, b) => {
            if (filters.sortBy === "fecha_asc") return a.createdAt?.toDate() - b.createdAt?.toDate();
            if (filters.sortBy === "votos") return (b.votes || 0) - (a.votes || 0);
            return b.createdAt?.toDate() - a.createdAt?.toDate();
        });
        
        return result;
    }, [complaints, filters]);
    
    // Paginación
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
        complaints, loading, form, dispatchForm, filters, setFilters: onFilterChange, 
        ui, setUi, toast, pushToast, complaintActions, paginatedComplaints, totalPages, stats
    }), [complaints, loading, form, filters, ui, toast, pushToast, complaintActions, paginatedComplaints, totalPages, stats, onFilterChange]);

    return <ComplaintContext.Provider value={contextValue}>{children}</ComplaintContext.Provider>;
};

// Componentes de UI auxiliares
const Toast = () => {
    const { toast } = useComplaintContext();
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }} transition={{ duration: 0.3 }}
                    style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, maxWidth: 300 }}
                >
                    <Alert variant="filled" icon={<IconAlertCircle size={20} />} radius="md"
                        style={{ background: 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)', boxShadow: '0 8px 24px rgba(117, 170, 219, 0.4)' }}>
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
            <Textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Escribe un comentario..." 
                minRows={1} maxRows={4} maxLength={500} size="md" radius="lg" style={{ flexGrow: 1 }} autosize
                styles={{ input: { borderColor: '#75AADB', '&:focus': { borderColor: '#5385AD' } } }} />
            <Button onClick={() => { if (txt.trim()) { complaintActions.onAddComment(complaintId, txt); setTxt(""); } }} 
                variant="gradient" gradient={{ from: '#75AADB', to: '#5385AD', deg: 105 }} size="md" radius="lg" 
                leftSection={<IconSend size={18} />} disabled={!txt.trim()}>
                Enviar
            </Button>
        </Group>
    );
};

const FilterRow = () => {
    const { filters, setFilters, complaintActions } = useComplaintContext();
    const categoryOptions = [{ value: "Todas las categorías", label: "Todas las categorías" }, ...CONFIG.CATEGORIES.map(c => ({ value: c, label: c }))];
    const statusOptions = [{ value: "Todos los estados", label: "Todos los estados" }, { value: "Abierto", label: "Abierto" }, { value: "Resuelto", label: "Resuelto" }];
    const sortOptions = [{ value: "fecha_desc", label: "📅 Más reciente" }, { value: "fecha_asc", label: "📅 Más antiguo" }, { value: "votos", label: "👍 Más votados" }];

    return (
        <Group align="flex-end" wrap="wrap" w="100%">
            <TextInput leftSection={<IconSearch size={18} />} placeholder="Buscar en reclamos..." value={filters.search} 
                onChange={e => setFilters('search', e.target.value)} size="lg" radius="lg" style={{ flexGrow: 1, minWidth: '200px' }} />
            <Select placeholder="Categoría" data={categoryOptions} value={filters.category} onChange={value => setFilters('category', value)} size="lg" radius="lg" style={{ minWidth: '180px' }} />
            <Select placeholder="Estado" data={statusOptions} value={filters.status} onChange={value => setFilters('status', value)} size="lg" radius="lg" style={{ minWidth: '180px' }} />
            <Select placeholder="Ordenar por" data={sortOptions} value={filters.sortBy} onChange={value => setFilters('sortBy', value)} size="lg" radius="lg" style={{ minWidth: '180px' }} />
            <ActionIcon variant="light" size="xl" radius="lg" color="teal" onClick={() => complaintActions.onExport('CSV')} title="Exportar a CSV"><IconFileLike size={22} /></ActionIcon>
        </Group>
    );
};

const ComplaintForm = () => { 
    const { form, dispatchForm, complaintActions, pushToast } = useComplaintContext();
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    const setField = (field, value) => dispatchForm({ type: 'SET_FIELD', field, value });
    
    return (
        <motion.form onSubmit={complaintActions.save} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Card shadow="xl" padding="xl" radius="xl" withBorder style={{ background: 'var(--mantine-color-body)', borderColor: isDark ? 'rgba(117, 170, 219, 0.2)' : 'rgba(117, 170, 219, 0.3)', borderWidth: 2 }}>
                <Box style={{ background: isDark ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' : 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)', borderRadius: 16, padding: '24px', marginBottom: '24px', color: 'white', textAlign: 'center' }}>
                    <Title order={2} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: 'clamp(22px, 5vw, 32px)', lineHeight: 1.2 }}>
                        {form.id ? "✏️ Editando Reclamo" : "📢 Crear Nuevo Reclamo"}
                    </Title>
                </Box>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <TextInput label="¿Cuál es el problema? *" placeholder="Ej: Semáforo roto en Av. Principal" value={form.title} onChange={e => setField('title', e.target.value)} maxLength={100} size="lg" radius="lg" rightSection={<Text size="sm" c="dimmed">{form.title.length}/100</Text>} required />
                    <Select label="Categoría *" placeholder="Selecciona una categoría" data={CONFIG.CATEGORIES.map(c => ({ value: c, label: c }))} value={form.category} onChange={value => setField('category', value)} size="lg" radius="lg" leftSection={<IconCategory size={18} />} required />
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <TextInput label="📍 Ubicación (Opcional)" placeholder="Ej: Esquina calle..." value={form.location} onChange={e => setField('location', e.target.value)} leftSection={<IconMapPin size={18} />} radius="lg" size="md" />
                        <Box style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 8 }}>
                            <Checkbox label="Publicar como Anónimo" checked={form.anonymous} onChange={e => setField('anonymous', e.target.checked)} size="md" style={{ cursor: 'pointer' }} />
                        </Box>
                    </SimpleGrid>
                    <Textarea label="Describe el problema en detalle... *" placeholder="✏️ Proporciona detalles específicos..." value={form.description} onChange={e => setField('description', e.target.value)} rows={4} maxLength={1000} radius="lg" rightSection={<Text size="sm" c="dimmed" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>{form.description.length}/1000</Text>} required />
                    <Box>
                        <FileInput label="📸 Adjuntar Imagen (Evidencia - Máx 5MB)" placeholder="Click para subir foto" accept="image/*" leftSection={<IconUpload size={18} />} clearable value={null} 
                            onChange={(file) => {
                                if (!file) return dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
                                if (file.size > CONFIG.MAX_IMAGE_SIZE_BYTES) {
                                    pushToast(`⌛ Archivo muy grande. Máx: ${CONFIG.MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`);
                                    return dispatchForm({ type: 'SET_FIELD', field: 'image', value: null });
                                }
                                complaintActions.onImageChange(file);
                            }} radius="lg" size="md" />
                    </Box>
                    {form.image && (
                        <Alert variant="light" color="teal" title="Imagen lista" icon={<IconCheck size={20} />} radius="lg" withCloseButton onClose={() => dispatchForm({ type: 'SET_FIELD', field: 'image', value: null })}>
                            <Group align="flex-start">
                                <img src={form.image} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }} />
                                <Button variant="subtle" color="red" size="xs" compact mt={4} onClick={() => dispatchForm({ type: 'SET_FIELD', field: 'image', value: null })}>Quitar</Button>
                            </Group>
                        </Alert>
                    )}
                    <Group justify="flex-end" pt="md">
                        {form.id && <Button variant="subtle" color="gray" radius="lg" onClick={() => dispatchForm({ type: 'RESET' })}>Cancelar</Button>}
                        <Button type="submit" variant="gradient" gradient={{ from: '#75AADB', to: '#5385AD', deg: 90 }} size="lg" radius="lg" style={{ boxShadow: '0 4px 16px rgba(117, 170, 219, 0.3)' }}>
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
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    const dataCards = [
        { title: "Total de Reclamos", value: stats.total.toString(), icon: IconChartBar, gradient: { from: '#75AADB', to: '#5385AD' }, description: 'Total de reclamos creados.' },
        { title: "Reclamos Abiertos", value: stats.open.toString(), icon: IconX, gradient: { from: '#ef4444', to: '#dc2626' }, description: 'Esperando solución.' },
        { title: "Reclamos Resueltos", value: stats.resolved.toString(), icon: IconCheck, gradient: { from: '#10b981', to: '#059669' }, description: 'Problemas solucionados.' },
        { title: "Votos Totales", value: stats.totalVotes.toString(), icon: IconArrowUp, gradient: { from: '#75AADB', to: '#5385AD' }, description: 'Apoyo comunitario.' }
    ];

    return (
        <AnimatePresence>
            {ui.isAdmin && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} style={{ marginBottom: '32px', marginTop: '32px' }}>
                    <Title order={2} ta="center" mb="xl" style={{ background: 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        📊 Estadísticas Comunitarias
                    </Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                        {dataCards.map((item, index) => (
                            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }} whileHover={{ y: -4 }}>
                                <Card shadow="md" padding="lg" radius="lg" withBorder style={{ background: 'var(--mantine-color-body)', borderColor: isDark ? 'rgba(117, 170, 219, 0.2)' : 'rgba(117, 170, 219, 0.3)', borderWidth: 2, height: '100%' }}>
                                    <Group justify="space-between" align="center" mb="md" wrap="nowrap">
                                        <Box style={{ flex: 1 }}>
                                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>{item.title}</Text>
                                            <Text size={36} fw={800} lh={1} style={{ background: `linear-gradient(135deg, ${item.gradient.from} 0%, ${item.gradient.to} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{item.value}</Text>
                                        </Box>
                                        <Box style={{ background: `linear-gradient(135deg, ${item.gradient.from} 0%, ${item.gradient.to} 100%)`, borderRadius: '8px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${item.gradient.from}40` }}>
                                            <item.icon size={20} color="white" stroke={2.5} />
                                        </Box>
                                    </Group>
                                    <Text size="xs" c="dimmed" lh={1.4} style={{ marginTop: 'auto' }}>{item.description}</Text>
                                </Card>
                            </motion.div>
                        ))}
                    </SimpleGrid>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ComplaintsList = () => {
    const { paginatedComplaints, loading } = useComplaintContext();
    if (loading) return <Group justify="center" mt="xl" p="xl"><Loader color="#75AADB" size="lg" /><Text>Cargando reclamos...</Text></Group>;

    return (
        <div style={{ marginTop: 48 }}>
            <Title order={2} ta="center" mb="xl" style={{ background: 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                💬 Reclamos de la Comunidad
            </Title>
            <AnimatePresence initial={false}>
                {paginatedComplaints.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Title order={3} c="dimmed">0 reclamos encontrados</Title>
                        <Text c="dimmed" mt="xs">Sé el primero en crear un reclamo.</Text>
                    </motion.div>
                ) : (
                    paginatedComplaints.map((c, index) => <ComplaintCard key={c.id} complaint={c} index={index} />)
                )}
            </AnimatePresence>
        </div>
    );
};

const ComplaintCard = ({ complaint: c, index }) => {
    const { ui, complaintActions } = useComplaintContext();
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    const [showComments, setShowComments] = useState(false);

    const statusMap = {
        "Abierto": { color: '#f59e0b', gradient: { from: '#f59e0b', to: '#d97706' }, text: '🔴 Abierto', textColor: '#fff' },
        "En Proceso": { color: '#3b82f6', gradient: { from: '#3b82f6', to: '#2563eb' }, text: '🔵 En Proceso', textColor: '#fff' },
        "Resuelto": { color: '#10b981', gradient: { from: '#10b981', to: '#059669' }, text: '✅ Resuelto', textColor: '#fff' }
    };
    const currentStatus = statusMap[c.status] || { color: 'gray', text: c.status };

    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} style={{ marginBottom: 24 }}>
            <Card shadow="lg" padding="xl" radius="xl" withBorder style={{ transition: "all 0.3s ease", background: 'var(--mantine-color-body)', borderColor: isDark ? 'rgba(117, 170, 219, 0.2)' : 'rgba(117, 170, 219, 0.3)', borderWidth: 2, overflow: 'hidden' }}>
                <Group justify="space-between" mb="md" wrap="wrap">
                    <Group gap="xs">
                        <Badge size="lg" radius="lg" style={{ background: `linear-gradient(135deg, ${currentStatus.gradient.from} 0%, ${currentStatus.gradient.to} 100%)`, color: currentStatus.textColor, border: 'none', fontWeight: 600, padding: '8px 16px', boxShadow: `0 4px 12px ${currentStatus.color}40` }}>{currentStatus.text}</Badge>
                        <Badge variant="light" color="blue" size="lg" radius="lg" style={{ fontWeight: 600 }}>{c.category}</Badge>
                        {c.anonymous && <Badge variant="outline" color="gray" size="md" radius="lg">👤 Anónimo</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed" fs="italic" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconClock size={14} /> {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleDateString() : ''}
                    </Text>
                </Group>

                <Title order={3} mb="md" style={{ lineHeight: 1.3 }}>{c.title}</Title>
                {c.location && <Text size="sm" c="dimmed" mb="sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconMapPin size={16} /> <strong>Ubicación:</strong> {c.location}</Text>}
                <Text size="md" mb="md" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{c.description}</Text>
                {c.imageUrl && (
                    <Box mb="md">
                        <Image src={c.imageUrl} alt="Evidencia" radius="lg" height={300} fit="cover" style={{ cursor: 'pointer', border: '2px solid rgba(117, 170, 219, 0.2)' }} onClick={() => window.open(c.imageUrl, '_blank')} />
                        <Text size="xs" c="dimmed" mt="xs" ta="center">Click para ampliar</Text>
                    </Box>
                )}

                <Group justify="space-between" mt="lg" wrap="wrap">
                    <Group>
                        <Button leftSection={<IconThumbUp size={18} />} onClick={() => complaintActions.onVote(c.id)} variant="gradient" gradient={{ from: '#75AADB', to: '#5385AD', deg: 90 }} size="md" radius="lg" style={{ boxShadow: '0 4px 12px rgba(117, 170, 219, 0.3)' }}>Votar ({c.votes || 0})</Button>
                        <Button leftSection={<IconMessageCircle size={18} />} onClick={() => setShowComments(!showComments)} variant="light" color="blue" size="md" radius="lg">Comentarios ({c.comments?.length || 0})</Button>
                    </Group>
                    {ui.isAdmin && (
                        <Group>
                            <ActionIcon variant="light" color="orange" size="lg" radius="lg" onClick={() => complaintActions.onEdit(c)} title="Editar"><IconPencil size={20} /></ActionIcon>
                            <ActionIcon variant="light" color="teal" size="lg" radius="lg" onClick={() => complaintActions.onToggleStatus(c.id, c.status)} title="Cambiar Estado"><IconArrowsLeftRight size={20} /></ActionIcon>
                            <ActionIcon variant="light" color="red" size="lg" radius="lg" onClick={() => complaintActions.onDelete(c.id)} title="Eliminar"><IconTrash size={20} /></ActionIcon>
                        </Group>
                    )}
                </Group>

                <AnimatePresence>
                    {showComments && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: '24px', paddingTop: '24px', borderTop: '2px solid rgba(117, 170, 219, 0.2)' }}>
                            {c.comments?.length > 0 ? (
    c.comments.map((comment) => (
        <Box key={comment.id} p="md" mb="sm" style={{ borderLeft: '4px solid #75AADB', backgroundColor: isDark ? 'rgba(117, 170, 219, 0.05)' : 'rgba(117, 170, 219, 0.08)', borderRadius: '8px' }}>
            <Group justify="space-between" mb="xs" wrap="wrap">
                <Group gap="xs">
                    <Box style={{ width: 32, height: 32, borderRadius: '50%', background: comment.user?.isAdmin ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                        {comment.user?.isAdmin ? '👑' : (comment.user?.displayName?.[0]?.toUpperCase() || '?')}
                    </Box>
                    <Box>
                        <Group gap={4}>
                            <Text size="sm" fw={600}>{comment.user?.displayName || 'Usuario Anónimo'}</Text>
                            {comment.user?.isAdmin && <Badge size="xs" variant="gradient" gradient={{ from: '#ef4444', to: '#dc2626' }}>ADMIN</Badge>}
                        </Group>
                        <Text size="xs" c="dimmed">
    {(() => {
        if (!comment.createdAt) return 'Justo ahora';
        
        try {
            // Manejo robusto de diferentes formatos de fecha
            let date;
            
            if (comment.createdAt.toDate) {
                // Timestamp de Firestore
                date = comment.createdAt.toDate();
            } else if (comment.createdAt.seconds) {
                // Objeto con seconds (Firestore sin método toDate)
                date = new Date(comment.createdAt.seconds * 1000);
            } else {
                // Date de JavaScript normal
                date = new Date(comment.createdAt);
            }
            
            return date.toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            console.error('Error formateando fecha:', e);
            return 'Hace un momento';
        }
    })()}
</Text>
                    </Box>
                </Group>
            </Group>
            <Text size="sm" style={{ marginLeft: 40 }}>{comment.text}</Text>
        </Box>
    ))
) : <Text size="sm" c="dimmed" ta="center" p="lg">Sin comentarios. ¡Sé el primero!</Text>}
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
    if (totalPages <= 1) return null;

    return (
        <Group justify="center" my="xl">
            <Button variant="light" color="blue" radius="lg" disabled={ui.page === 1} onClick={() => setUi(prev => ({ ...prev, page: prev.page - 1 }))}>←</Button>
            <Text>Página {ui.page} de {totalPages}</Text>
            <Button variant="light" color="blue" radius="lg" disabled={ui.page === totalPages} onClick={() => setUi(prev => ({ ...prev, page: prev.page + 1 }))}>→</Button>
        </Group>
    );
};

const AdminLoginModal = ({ opened, onClose, onSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            if (onSuccess) onSuccess();
            onClose();
            setEmail("");
            setPassword("");
        } catch (err) {
            console.error(err);
            setError("Credenciales inválidas");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Acceso Administrativo" centered radius="lg">
            <form onSubmit={handleLogin}>
                <TextInput label="Email" placeholder="admin@comuna.com" required value={email} onChange={(e) => setEmail(e.target.value)} mb="md" />
                <PasswordInput label="Contraseña" placeholder="Tu contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} mb="md" />
                {error && <Text c="red" size="sm" mb="md">{error}</Text>}
                <Button fullWidth type="submit" loading={loading} variant="gradient" gradient={{ from: '#75AADB', to: '#5385AD' }}>Ingresar</Button>
            </form>
        </Modal>
    );
};

function AppContent() {
    const { ui, pushToast } = useComplaintContext();
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';
    const [loginOpened, { open: openLogin, close: closeLogin }] = useDisclosure(false);

    return (
        <Container size="xl" mt="md">
            <ComplaintForm />
            <StatsPanel />
            <Box mt="xl"><FilterRow /></Box>
            <ComplaintsList />
            <Pagination />
            <Toast />
            
            <Group justify="center" mt="xl" mb="xl">
                {!ui.isAdmin ? (
                    <Button variant="subtle" color="gray" size="sm" onClick={openLogin}>🔒 Acceso Admin</Button>
                ) : (
                    <Button variant="outline" color="red" size="sm" onClick={() => { signOut(auth); pushToast("👋 Sesión cerrada"); }}>🔓 Cerrar Sesión</Button>
                )}
            </Group>
            <AdminLoginModal opened={loginOpened} onClose={closeLogin} onSuccess={() => pushToast("✅ Sesión iniciada")} />
            
            <Box component="footer" style={{ textAlign: 'center', marginTop: 48, paddingTop: 24, borderTop: isDark ? '2px solid rgba(117, 170, 219, 0.2)' : '2px solid rgba(117, 170, 219, 0.3)', background: isDark ? 'linear-gradient(135deg, rgba(117, 170, 219, 0.05) 0%, rgba(83, 133, 173, 0.05) 100%)' : 'linear-gradient(135deg, rgba(117, 170, 219, 0.08) 0%, rgba(83, 133, 173, 0.08) 100%)', borderRadius: 16, padding: 24 }}>
                <Text size="sm" c="dimmed">Hecho con 💙 para la comunidad</Text>
                <Text size="sm" c="dimmed" fw={600}>Foro de Reclamos Comunal - Tu voz importa</Text>
            </Box>
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