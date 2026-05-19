
import React, { useState } from 'react';
import { User, UserRole, Worker, SkillLevel } from '../types';
import { 
  UserCog, Trash2, Edit, X, Plus, 
  CheckCircle2, AlertTriangle, Key
} from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: any) => void;
  onEditUser: (user: any) => void;
  onAddWorker: (worker: any) => void;
  onDeleteUser: (userId: string) => void;
}

const UserManagement: React.FC<Props> = ({ users, onAddUser, onEditUser, onAddWorker, onDeleteUser }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Staff' as UserRole,
    jobTitle: ''
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username) return;

    const timestamp = Date.now();
    const userId = `u${timestamp}`;
    const workerId = `w${timestamp}`;
    
    const userToAdd: User = {
      id: userId,
      name: newUser.name,
      username: newUser.username.toLowerCase(),
      password: newUser.password,
      role: newUser.role,
      workerId: workerId
    };
    onAddUser(userToAdd);

    if (newUser.role !== 'Admin') {
      const workerToAdd: Worker = {
        id: workerId,
        name: newUser.name,
        role: newUser.jobTitle || newUser.role,
        skillLevel: SkillLevel.Junior,
        certifications: [],
        productivityScore: 100,
        fatigueLevel: 0,
        currentLocation: 'General Assembly',
        vitals: { heartRate: 75, bodyTemp: 36.5, oxygenLevel: 98 },
        ppeCompliant: true,
        status: 'Active',
        safetyStatus: 'Pending'
      };
      onAddWorker(workerToAdd);
    }

    setIsAddModalOpen(false);
    setNewUser({ name: '', username: '', password: '', role: 'Staff', jobTitle: '' });
  };

  const handleEditClick = (user: User) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onEditUser(editingUser);
      setIsEditModalOpen(false);
      setEditingUser(null);
    }
  };

  return (
    <div className="space-y-6 relative pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">User Management Terminal</h2>
          <p className="text-slate-500 text-sm font-medium">Provision and manage OLFU staff access permissions and operational roles.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> Provision New User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Identity Profile</th>
              <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Access Role</th>
              <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-5 font-bold text-slate-900 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black uppercase border border-slate-200 shadow-inner group-hover:bg-white transition-colors">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-base tracking-tight">{user.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block mt-1">@{user.username}</p>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                    user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    user.role === 'SafetyOfficer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    user.role === 'Supervisor' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditClick(user)} className="p-3 text-slate-400 hover:text-blue-600 transition-all bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md"><Edit size={18} /></button>
                    <button onClick={() => onDeleteUser(user.id)} className="p-3 text-slate-400 hover:text-red-600 transition-all bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className={`p-8 flex justify-between items-center text-white ${isAddModalOpen ? 'bg-indigo-600' : 'bg-blue-600'}`}>
              <div>
                <h3 className="font-black uppercase tracking-widest flex items-center gap-3 text-lg">
                  {isAddModalOpen ? <Plus size={24} /> : <Edit size={24} />}
                  {isAddModalOpen ? 'Account Provisioning' : 'Modify Access Profile'}
                </h3>
                <p className="text-white/70 text-[10px] uppercase font-bold tracking-tighter mt-1">OLFU SafetyNet Access Control</p>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={28} /></button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="p-10 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Official Legal Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Full Name"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800" 
                    value={isAddModalOpen ? newUser.name : (editingUser?.name || '')} 
                    onChange={(e) => isAddModalOpen ? setNewUser({...newUser, name: e.target.value}) : setEditingUser(editingUser ? {...editingUser, name: e.target.value} : null)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">System Handle / Login</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                    <input 
                      type="text" 
                      required 
                      placeholder="username"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800" 
                      value={isAddModalOpen ? newUser.username : (editingUser?.username || '')} 
                      onChange={(e) => isAddModalOpen ? setNewUser({...newUser, username: e.target.value}) : setEditingUser(editingUser ? {...editingUser, username: e.target.value} : null)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Access Password</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      <Key size={16} />
                    </span>
                    <input 
                      type="password" 
                      required={isAddModalOpen}
                      placeholder={isAddModalOpen ? "Primary Password" : "Leave blank to keep existing"}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800" 
                      value={isAddModalOpen ? newUser.password : (editingUser?.password || '')} 
                      onChange={(e) => isAddModalOpen ? setNewUser({...newUser, password: e.target.value}) : setEditingUser(editingUser ? {...editingUser, password: e.target.value} : null)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Operational Role</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" 
                      value={isAddModalOpen ? newUser.role : (editingUser?.role || 'Staff')} 
                      onChange={(e) => isAddModalOpen ? setNewUser({...newUser, role: e.target.value as UserRole}) : setEditingUser(editingUser ? {...editingUser, role: e.target.value as UserRole} : null)}
                    >
                      <option value="Staff">Staff</option>
                      <option value="SafetyOfficer">Safety Officer</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Designation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Technician"
                      disabled={(isAddModalOpen ? newUser.role : editingUser?.role) === 'Admin'}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 disabled:opacity-50" 
                      value={isAddModalOpen ? newUser.jobTitle : ''} 
                      onChange={(e) => setNewUser({...newUser, jobTitle: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                className={`w-full text-white font-black py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest mt-4 ${isAddModalOpen ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
              >
                {isAddModalOpen ? 'Create Access Identity' : 'Update Access Identity'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
