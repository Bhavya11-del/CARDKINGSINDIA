import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ShieldAlert, Users, Activity, Settings, BarChart } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    setStats({
      totalUsers: 48291,
      activeGames: 342,
      onlineNow: 1245,
      revenue: '₹ 0 (Free to Play)',
      recentReports: [
        { id: 1, user: 'BadBot99', reason: 'Spamming emotes', status: 'Pending' },
        { id: 2, user: 'AngryGamer', reason: 'Abusive chat', status: 'Reviewed' }
      ]
    });
  }, [user, navigate]);

  if (!stats) return null;

  return (
    <div className="min-h-screen pt-20 px-4 pb-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <h1 className="font-cinzel text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: <Users className="w-6 h-6 text-blue-400" /> },
            { label: 'Active Games', value: stats.activeGames, icon: <Activity className="w-6 h-6 text-green-400" /> },
            { label: 'Online Now', value: stats.onlineNow.toLocaleString(), icon: <BarChart className="w-6 h-6 text-gold" /> },
            { label: 'Platform Revenue', value: stats.revenue, icon: <Settings className="w-6 h-6 text-purple-400" /> }
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 border-l-4 border-l-gold">
              <div className="flex justify-between items-start mb-2">
                <div className="text-white/60 text-sm">{stat.label}</div>
                {stat.icon}
              </div>
              <div className="font-cinzel font-bold text-2xl text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6">
            <h2 className="font-cinzel text-lg font-bold text-white mb-4">Moderation Queue</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="pb-2 font-medium">Report ID</th>
                    <th className="pb-2 font-medium">Reported User</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {stats.recentReports.map((r: any) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="py-3">#{r.id}</td>
                      <td className="py-3 text-gold">{r.user}</td>
                      <td className="py-3">{r.reason}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${r.status === 'Pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => toast.success(`User ${r.user} banned!`)} className="btn-danger !px-3 !py-1 !text-xs mr-2">Ban</button>
                        <button onClick={() => toast.success(`Report #${r.id} dismissed.`)} className="btn-ghost !px-3 !py-1 !text-xs">Dismiss</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="font-cinzel text-lg font-bold text-white mb-4">System Status</h2>
            <div className="space-y-4">
              {[
                { name: 'API Server', status: 'Operational', color: 'bg-green-500' },
                { name: 'Socket Server', status: 'Operational', color: 'bg-green-500' },
                { name: 'Database', status: 'Operational', color: 'bg-green-500' },
                { name: 'Matchmaking', status: 'High Load', color: 'bg-amber-500' }
              ].map(sys => (
                <div key={sys.name} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-white/80 text-sm">{sys.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{sys.status}</span>
                    <div className={`w-2 h-2 rounded-full ${sys.color} shadow-[0_0_8px_currentColor]`} />
                  </div>
                </div>
              ))}
              
              <button onClick={() => toast.success('Servers restarting... (Simulation)')} className="w-full mt-4 btn-ghost !py-2 text-sm flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> Restart Servers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
