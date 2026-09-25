import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const OperationsTeamPage = () => {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const loadMembers = useCallback(async () => {
    try {
      const response = await api.get('/admin/operations-members');
      setMembers(response.data.members || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load the operations team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMembers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMembers]);

  const addMember = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.post('/admin/operations-members', { email: email.trim() });
      toast.success(response.data.alreadyMember ? 'This account already has operations access.' : 'Operations access granted.');
      setEmail('');
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to grant operations access.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove COD Operations Desk access for ${member.name || member.email}?`)) return;
    setRemovingId(member.id);
    try {
      await api.delete(`/admin/operations-members/${member.id}`);
      toast.success('Operations access removed.');
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to remove operations access.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main className="operations-team">
      <header>
        <span>Internal access</span>
        <h1>COD Operations Team</h1>
        <p>Give a dedicated rifKANDO account access to parcel coordination only. Operations members can view delivery tasks, record pickup and field reports, and contact the buyer or seller. They cannot see bank details, verify commission, record cash, or release a seller payout.</p>
      </header>

      <section className="operations-team__card">
        <h2>Add a team member</h2>
        <p>Toufiq must first create a normal rifKANDO account with this email. Use a separate buyer account, not a seller, finance, or administrator account.</p>
        <form onSubmit={addMember}>
          <label htmlFor="operations-email">rifKANDO account email</label>
          <div>
            <input id="operations-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team.member@example.com" required />
            <button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Grant access'}</button>
          </div>
        </form>
      </section>

      <section className="operations-team__card">
        <div className="operations-team__section-heading"><div><h2>Current operations members</h2><p>Each change is recorded in the administrative audit log.</p></div><button type="button" className="secondary" onClick={() => void loadMembers()}>Refresh</button></div>
        {loading ? <p className="operations-team__empty">Loading team…</p> : members.length === 0 ? <p className="operations-team__empty">No operations accounts have been added yet.</p> : <div className="operations-team__members">
          {members.map((member) => <article key={member.id}>
            <div><strong>{member.name || 'rifKANDO team member'}</strong><span>{member.email}</span><small>Operations access since {new Date(member.created_at).toLocaleDateString()}</small></div>
            <button type="button" className="danger" disabled={removingId === member.id} onClick={() => void removeMember(member)}>{removingId === member.id ? 'Removing…' : 'Remove access'}</button>
          </article>)}
        </div>}
      </section>

      <section className="operations-team__notice">
        <strong>Safe use:</strong> remove access immediately if a team member stops working with rifKANDO. Finance reconciliation stays in the separate COD Reconciliation page under your control.
      </section>

      <style>{`.operations-team{max-width:62rem;margin:0 auto;padding:1.5rem;color:#10233f}.operations-team header{max-width:52rem;margin-bottom:1.25rem}.operations-team header span{color:#168dd9;text-transform:uppercase;letter-spacing:.09em;font-size:.75rem;font-weight:800}.operations-team h1{margin:.3rem 0;font-size:1.85rem}.operations-team h2{margin:0;font-size:1.1rem}.operations-team p{color:#607187;line-height:1.55}.operations-team__card{background:#fff;border:1px solid #dbe6ef;border-radius:1rem;padding:1.2rem;margin-bottom:1rem;box-shadow:0 .5rem 1.5rem rgba(16,35,63,.05)}.operations-team form{margin-top:1rem}.operations-team label{display:block;margin-bottom:.4rem;color:#526477;font-size:.8rem;font-weight:750}.operations-team form>div{display:flex;gap:.65rem}.operations-team input{min-width:0;flex:1;border:1px solid #cddbe7;border-radius:.55rem;padding:.7rem .75rem;font:inherit}.operations-team button{border:0;border-radius:.55rem;background:#168dd9;color:#fff;padding:.7rem .9rem;font:inherit;font-weight:750;cursor:pointer}.operations-team button:disabled{opacity:.6;cursor:wait}.operations-team button.secondary{background:#eef5f9;color:#176489}.operations-team button.danger{background:#fff0f0;color:#b42318}.operations-team__section-heading{display:flex;justify-content:space-between;gap:1rem;align-items:start}.operations-team__section-heading p{margin:.3rem 0 0}.operations-team__members{display:grid;gap:.7rem;margin-top:1rem}.operations-team__members article{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-top:1px solid #edf2f6;padding-top:.8rem}.operations-team__members article div{display:grid;gap:.15rem}.operations-team__members span,.operations-team__members small{color:#607187;font-size:.88rem}.operations-team__empty{padding:.8rem 0;margin:.6rem 0 0}.operations-team__notice{border-left:4px solid #168dd9;background:#f2faff;color:#36526d;border-radius:.5rem;padding:.9rem 1rem;line-height:1.5}@media(max-width:640px){.operations-team{padding:1rem}.operations-team form>div,.operations-team__section-heading,.operations-team__members article{flex-direction:column;align-items:stretch}.operations-team button{width:100%}}`}</style>
    </main>
  );
};

export default OperationsTeamPage;
