import { Head, useForm } from '@inertiajs/react';

interface ChatTemplate { id:number; name:string; system_prompt:string|null; starter_prompt:string|null; visibility:string; }

export default function ChatTemplatesIndex({ templates }: { templates: ChatTemplate[] }) {
  const { data, setData, post, processing, reset } = useForm({ name: '', system_prompt: '', starter_prompt: '', visibility: 'private' });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Head title="Plantillas de Chat" />
      <h1 className="text-2xl font-bold">Chat &gt; Plantillas</h1>
      <form onSubmit={(e) => { e.preventDefault(); post(route('chat.templates.store'), { onSuccess: () => reset() }); }} className="space-y-3 border rounded p-4">
        <input className="w-full border p-2" placeholder="Nombre" value={data.name} onChange={e => setData('name', e.target.value)} />
        <textarea className="w-full border p-2" placeholder="System prompt" value={data.system_prompt} onChange={e => setData('system_prompt', e.target.value)} />
        <textarea className="w-full border p-2" placeholder="Starter prompt" value={data.starter_prompt} onChange={e => setData('starter_prompt', e.target.value)} />
        <select className="border p-2" value={data.visibility} onChange={e => setData('visibility', e.target.value)}>
          <option value="private">Privada</option><option value="account">Cuenta</option><option value="team">Equipo</option>
        </select>
        <button disabled={processing} className="px-3 py-2 bg-black text-white rounded">Guardar</button>
      </form>
      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="border rounded p-3">
            <div className="font-semibold">{template.name}</div>
            <div className="text-xs opacity-70">{template.visibility}</div>
            <div className="text-sm mt-2">{template.starter_prompt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
