import { useState } from 'react';

export default function SettingsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', relationship: '' });
  const [message, setMessage] = useState('');

  async function loadContacts() {
    // For now load contacts for seeded test user if present
    const res = await fetch('/api/check-in/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: '11111111-1111-1111-1111-111111111111' }) });
    const data = await res.json();
    if (res.ok) setContacts(data.contacts || []);
  }

  async function createContact(e: any) {
    e.preventDefault();
    setMessage('Creating…');
    const res = await fetch('/api/contacts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: '11111111-1111-1111-1111-111111111111', ...form }) });
    const data = await res.json();
    if (res.ok) {
      setMessage('Contact created');
      setForm({ full_name: '', phone: '', email: '', relationship: '' });
      await loadContacts();
    } else {
      setMessage(data.error || 'Failed');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Settings</h1>
      <p>{message}</p>
      <section style={{ marginTop: 12 }}>
        <h2>Contacts</h2>
        <button onClick={loadContacts}>Load contacts</button>
        <ul>
          {contacts.map((c) => (
            <li key={c.id}>{c.full_name}</li>
          ))}
        </ul>

        <form onSubmit={createContact} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          <button type="submit">Add contact</button>
        </form>
      </section>
    </main>
  );
}
