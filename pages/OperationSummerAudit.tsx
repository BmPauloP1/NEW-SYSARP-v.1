

import React, { useState, useEffect } from 'react';
import { operationSummerService } from '../services/operationSummerService';
import { base44 } from '../services/base44Client';
import { SummerAuditLog } from '../types_summer';
import { Pilot } from '../types';
import { Card } from '../components/ui_components';
import { Shield, User, Clock } from 'lucide-react';

export default function OperationSummerAudit() {
  const [logs, setLogs] = useState<SummerAuditLog[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
          const [l, p] = await Promise.all([
            operationSummerService.getAuditLogs(),
            base44.entities.Pilot.list()
          ]);
          setLogs(l);
          setPilots(p);
      } catch (e: any) {
          if (e.message && e.message.includes("Failed to fetch")) {
             console.warn("Network error loading audit logs");
          } else {
             console.error(e);
          }
      } finally {
          setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Shield className="w-8 h-8 text-slate-600" />
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Auditoria do Sistema</h1>
           <p className="text-sm text-slate-500">Log de alterações e registros da Operação Verão</p>
        </div>
      </div>

      <Card className="overflow-hidden shadow-md border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800 text-slate-200 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário Responsável</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => {
                const user = pilots.find(p => p.id === log.user_id);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                         <Clock className="w-3 h-3" />
                         {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        {user?.full_name || 'Sistema / Desconhecido'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.action === 'CREATE' ? 'bg-green-100 text-green-700' : 
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 italic">
                       {log.details}
                    </td>
                  </tr>
                );
              })}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">Nenhum registro de auditoria encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
