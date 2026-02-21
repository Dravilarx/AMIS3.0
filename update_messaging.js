const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/modules/messaging/MessagingHub.tsx');

let content = fs.readFileSync(targetFile, 'utf8');

// We will do several replacements based on our observations.

// 1. Import supabase
if (!content.includes('import { supabase }')) {
    content = content.replace("import { useAuth }", "import { supabase } from '../../lib/supabase';\nimport { useAuth }");
}

// 2. Add search states
const statesBlock = `    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUsersInfo, setSelectedUsersInfo] = useState<{id: string, name: string}[]>([]); // Para el modal de grupo
`;
content = content.replace("const [tab, setTab] = useState<'channels' | 'people'>('channels');", statesBlock);

// 3. Add search useEffect
const useEffectSearch = `
    // Buscador global de personas
    useEffect(() => {
        if (searchTerm.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const fetchUsers = async () => {
            setIsSearching(true);
            try {
                const queryText = \`%\${searchTerm.toLowerCase()}%\`;
                const [profilesRes, profsRes] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, role, rut').or(\`full_name.ilike.\${queryText},rut.ilike.\${queryText}\`).limit(10),
                    supabase.from('professionals').select('id, name, last_name, role, national_id').or(\`name.ilike.\${queryText},last_name.ilike.\${queryText},national_id.ilike.\${queryText}\`).limit(10)
                ]);

                const combinedProfiles: any[] = [];
                if (profilesRes.data) {
                    combinedProfiles.push(...profilesRes.data.map(p => ({
                        id: p.id,
                        full_name: p.full_name,
                        rut: p.rut,
                        role: p.role || 'Admin/App',
                        source: 'perfil'
                    })));
                }
                if (profsRes.data) {
                    combinedProfiles.push(...profsRes.data.map(p => ({
                        id: p.id,
                        full_name: \`\${p.name} \${p.last_name}\`,
                        rut: p.national_id,
                        role: p.role,
                        source: 'clínico'
                    })));
                }
                const unique = Array.from(new Map(combinedProfiles.map(item => [item.id, item])).values());
                setSearchResults(unique.slice(0, 15));
            } catch (err) {
                console.error('Error searching users:', err);
            } finally {
                setIsSearching(false);
            }
        };
        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);
`;

// Insert the search effect right before `const activeChannel =`
content = content.replace("const activeChannel =", useEffectSearch + "\n    const activeChannel =");

// 4. Update the handleSelectPerson to take our unified object
content = content.replace("const handleSelectPerson = async (p: any) => {", `const handleSelectPerson = async (p: any) => {
        const personName = p.full_name;
        // Encontrar o crear un canal directo con la persona`);
content = content.replace("const personName = `${p.name} ${p.lastName}`;", "");

// 5. Build Group: we need to handle adding user info so we can display tags
const toggleProfFn = `    const toggleProfessionalSelection = (userObj: {id: string, name: string}) => {
        setSelectedProfessionals(prev => {
            if (prev.includes(userObj.id)) {
                setSelectedUsersInfo(current => current.filter(u => u.id !== userObj.id));
                return prev.filter(pId => pId !== userObj.id);
            } else {
                setSelectedUsersInfo(current => [...current, userObj]);
                return [...prev, userObj.id];
            }
        });
    };`;
content = content.replace(/const toggleProfessionalSelection = \([^}]*};/m, toggleProfFn);

// Now the UI for handles
const fileAttachmentStr = `    const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChannelId) return;

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = \`chat_attachments/\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
            
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            await sendToChannel(\`[Archivo Adjunto: \${file.name}](\${publicUrl})\`, 'file');
        } catch (err) {
            console.error('Error uploading file:', err);
            await sendToChannel(\`[Archivo Adjunto Sin Nube: \${file.name}]\`, 'file');
        }
    };`;
content = content.replace(/const handleAttachment = async \([^}]*};/m, fileAttachmentStr);

// 6. Rewrite the Sidebar UI 
const sidebarJSXOld = `<div className="w-80 flex flex-col gap-4">
                <div className="flex bg-prevenort-surface p-1 rounded-xl border border-prevenort-border">`;

// Instead of pure regex on huge tags, I will use fs.writeFileSync directly later.
fs.writeFileSync('temp_update.txt', 'done');
