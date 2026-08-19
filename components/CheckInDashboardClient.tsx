'use client';

import { useState, useEffect } from 'react';

export interface ScheduleItem {
  id: string;
  frequency: string;
  interval: number;
  next_check_in_at: string;
  current_status: string;
  paused_until?: string | null;
}

interface CheckInDashboardClientProps {
  userId: string;
  userEmail?: string | null;
  userFullName?: string | null;
  schedules: ScheduleItem[];
}

export default function CheckInDashboardClient({ schedules: initialSchedules, userId, userEmail, userFullName }: CheckInDashboardClientProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [message, setMessage] = useState<string>('Manage your active schedules and pause check-ins when needed.');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newFrequency, setNewFrequency] = useState<string>('daily');
  const [newInterval, setNewInterval] = useState<number>(1);
  const [newStartAt, setNewStartAt] = useState<string>('');
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string; email?: string | null }>>([]);
  const [selectedContact, setSelectedContact] = useState<string | undefined>(undefined);
  const [escalationStep, setEscalationStep] = useState<number>(0);
  const [preferredChannel, setPreferredChannel] = useState<string>('email');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactFullName, setContactFullName] = useState<string>('');
  const [contactRelationship, setContactRelationship] = useState<string>('');
  const [contactRole, setContactRole] = useState<string>('human_verifier');

  async function fetchSchedules() {
    const response = await fetch('/api/check-in/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    if (response.ok) {
      setSchedules(data.schedules || []);
    } else {
      setMessage(data.error || 'Unable to refresh schedules.');
    }
  }

  async function updateSchedule(scheduleId: string, action: 'confirm' | 'pause') {
    setLoadingId(scheduleId);
    let endpoint = '/api/check-in/respond';
    const body: Record<string, unknown> = { userId, scheduleId, responseType: 'ok' };

    if (action === 'pause') {
      endpoint = '/api/check-in/pause';
      body.pauseDays = 7;
      body.reason = 'Vacation pause';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      setMessage(data.message || 'Action completed successfully.');
      await fetchSchedules();
    } else {
      setMessage(data.error || 'Unable to complete action.');
    }
    setLoadingId(null);
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    setMessage('Creating schedule…');
    const body = {
      userId,
      email: userEmail,
      full_name: userFullName,
      frequency: newFrequency,
      interval: newInterval,
      startAt: newStartAt || undefined,
      escalation_step: escalationStep,
      preferred_channel: preferredChannel,
      contact_id: selectedContact && selectedContact !== '__new' ? selectedContact : undefined,
      contact_full_name: selectedContact === '__new' ? contactFullName || undefined : undefined,
      contact_relationship: selectedContact === '__new' ? contactRelationship || undefined : undefined,
      contact_role: selectedContact === '__new' ? contactRole || undefined : undefined,
      contact_email: selectedContact === '__new' ? contactEmail || undefined : contactEmail || undefined,
      contact_phone: selectedContact === '__new' ? contactPhone || undefined : contactPhone || undefined,
    } as Record<string, any>;

    const res = await fetch('/api/check-in/schedules/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage('Schedule created.');
      // Refresh schedules and contacts; if API returned a created contact select it.
      await fetchSchedules();
      await fetchContacts();
      if (data?.created_contact?.id) {
        setSelectedContact(data.created_contact.id);
      }
      setShowCreate(false);
      setNewInterval(1);
      setNewFrequency('daily');
      setNewStartAt('');
      setContactFullName('');
      setContactEmail('');
      setContactPhone('');
      setContactRelationship('');
      setContactRole('human_verifier');
    } else {
      setMessage(data.error || 'Unable to create schedule.');
    }
  }

  async function fetchContacts() {
    const res = await fetch('/api/check-in/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok) setContacts(data.contacts || []);
  }

  function handleContactChange(contactId: string) {
    setSelectedContact(contactId || undefined);
    const contact = contacts.find((item) => item.id === contactId);
    setContactEmail(contact?.email ?? '');
  }

  useEffect(() => {
    if (showCreate) {
      fetchContacts();
    }
  }, [showCreate]);

  return (
    <main className="page">
      <section className="card">
        <h1>Check-In Dashboard</h1>
        <p>{message}</p>

        {schedules.length === 0 ? (
          <p>No schedules found.</p>
        ) : (
          <div className="schedule-list">
            {schedules.map((schedule) => (
              <article key={schedule.id} className="schedule-item">
                <div>
                  <strong>{schedule.frequency}</strong> every {schedule.interval} interval
                  <p>Next due: {new Date(schedule.next_check_in_at).toLocaleString()}</p>
                  <p>Status: {schedule.current_status}</p>
                </div>
                <div className="actions">
                  <button onClick={() => updateSchedule(schedule.id, 'confirm')} disabled={loadingId === schedule.id}>
                    {loadingId === schedule.id ? 'Confirming…' : "I'm OK"}
                  </button>
                  <button onClick={() => updateSchedule(schedule.id, 'pause')} disabled={loadingId === schedule.id}>
                    {loadingId === schedule.id ? 'Pausing…' : 'Pause 7d'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <button onClick={() => setShowCreate((s) => !s)} style={{ marginRight: 8 }}>
            {showCreate ? 'Close' : 'Add Schedule'}
          </button>
        </div>

        {showCreate ? (
          <form onSubmit={createSchedule} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <label>
              Frequency
              <select value={newFrequency} onChange={(e) => setNewFrequency(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            <label>
              Interval
              <input type="number" min={1} value={newInterval} onChange={(e) => setNewInterval(Number(e.target.value))} />
            </label>
            <label>
              Preferred channel
              <select value={preferredChannel} onChange={(e) => setPreferredChannel(e.target.value)}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="voice">Voice</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label>
              Escalation step
              <input type="number" min={0} value={escalationStep} onChange={(e) => setEscalationStep(Number(e.target.value))} />
            </label>
            <label>
              Contact (optional)
              <select value={selectedContact || ''} onChange={(e) => handleContactChange(e.target.value)} onFocus={fetchContacts}>
                <option value="">— none —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
                <option value="__new">+ Add new contact…</option>
              </select>
            </label>
            {selectedContact === '__new' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label>
                  Full name
                  <input type="text" value={contactFullName} onChange={(e) => setContactFullName(e.target.value)} required />
                </label>
                {preferredChannel === 'email' ? (
                  <label>
                    Contact email
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
                  </label>
                ) : null}
                {preferredChannel === 'sms' || preferredChannel === 'voice' || preferredChannel === 'whatsapp' ? (
                  <label>
                    Contact phone
                    <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
                  </label>
                ) : null}
                <label>
                  Relationship
                  <input type="text" value={contactRelationship} onChange={(e) => setContactRelationship(e.target.value)} />
                </label>
                <label>
                  Role
                  <select value={contactRole} onChange={(e) => setContactRole(e.target.value)}>
                    <option value="human_verifier">Human verifier</option>
                    <option value="beneficiary">Beneficiary</option>
                    <option value="primary_caregiver">Primary caregiver</option>
                    <option value="emergency_contact">Emergency contact</option>
                  </select>
                </label>
              </div>
            ) : null}
            {preferredChannel === 'email' ? (
              <label>
                Contact email
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </label>
            ) : null}
            {preferredChannel === 'sms' || preferredChannel === 'voice' || preferredChannel === 'whatsapp' ? (
              <label>
                Contact phone
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </label>
            ) : null}
            <label>
              Start date (optional)
              <input type="datetime-local" value={newStartAt} onChange={(e) => setNewStartAt(e.target.value)} />
            </label>
            <div>
              <button type="submit">Create</button>
            </div>
          </form>
        ) : null}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 1.5rem;
          background: #020617;
          color: #e2e8f0;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .card {
          width: min(100%, 720px);
          background: rgba(15, 23, 42, 0.95);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
        }
        h1 {
          margin: 0 0 0.75rem;
        }
        .schedule-list {
          margin-top: 1.5rem;
          display: grid;
          gap: 1rem;
        }
        .schedule-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 18px;
          background: rgba(148, 163, 184, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .actions {
          display: grid;
          gap: 0.75rem;
          align-items: center;
        }
        button {
          border: none;
          border-radius: 14px;
          padding: 0.9rem 1rem;
          cursor: pointer;
          color: #020617;
          background: #38bdf8;
          font-weight: 700;
        }
      `}</style>
    </main>
  );
}
