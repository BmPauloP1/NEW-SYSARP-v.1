

import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "../services/base44Client";
import { Pilot, ORGANIZATION_CHART } from "../types";
import { Card, Button, Badge, Input, Select } from "../components/ui_components";
import { Plus, User, X, Save, Phone, Lock, Shield, Trash2, Database, Copy, Pencil, Search, ChevronLeft, ChevronRight, Mail } from "lucide-react";

export default function PilotManagement() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [currentUser, setCurrentUser] = useState<Pilot | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPilotId, setEditingPilotId] = useState<string | null>(null);
  
  // SQL Fix Modal State
  const [sqlError, setSqlError] = useState<string | null>(null);
  
  // Estado para o prefixo do email (antes do @)
  const [emailPrefix, setEmailPrefix] = useState("");

  const [formData, setFormData] = useState<Partial<Pilot>>({
    role: 'operator',
    status: 'active',
    course_type: 'internal'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [data, me] = await Promise.all([
        base44.entities.Pilot.list(),
        base44.auth.me()
      ]);
      setPilots(data);
      setCurrentUser(me);
    } catch (e: any) {
      if (e.message !== "Não autenticado") {
         console.error("Erro ao carregar dados", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (phone: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  // --- LOGICA DE FILTRO E PAGINAÇÃO ---

  const filteredPilots = useMemo(() => {
    return pilots.filter(pilot => {
      const searchLower = searchTerm.toLowerCase();
      return (
        pilot.full_name?.toLowerCase().includes(searchLower) ||
        pilot.sarpas_code?.toLowerCase().includes(searchLower) ||
        pilot.crbm?.toLowerCase().includes(searchLower) ||
        pilot.unit?.toLowerCase().includes(searchLower)
      );
    });
  }, [pilots, searchTerm]);

  const totalPages = Math.ceil(filteredPilots.length / itemsPerPage);
  
  const currentPilots = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredPilots.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredPilots, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reseta para a primeira página ao pesquisar
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // --- AÇÕES ---

  const handleEdit = (pilot: Pilot) => {
    setEditingPilotId(pilot.id);
    
    // Extrai o prefixo do e-mail para o campo de edição
    const prefix = pilot.email.split('@')[0];
    setEmailPrefix(prefix);

    setFormData({
      full_name: pilot.full_name,
      phone: pilot.phone,
      sarpas_code: pilot.sarpas_code,
      crbm: pilot.crbm,
      unit: pilot.unit,
      license: pilot.license,
      role: pilot.role,   // Carrega o papel atual
      status: pilot.status // Carrega o status atual
    });
    
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingPilotId(null);
    setFormData({ 
      role: 'operator', 
      status: 'active', 
      course_type: 'internal',
      full_name: '',
      phone: '',
      sarpas_code: '',
      license: '',
      crbm: '',
      unit: ''
    });
    setEmailPrefix("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullEmail = `${emailPrefix.toLowerCase()}@cbm.pr.gov.br`;

      if (editingPilotId) {
        // --- MODO EDIÇÃO ---
        await base44.entities.Pilot.update(editingPilotId, {
          full_name: formData.full_name,
          phone: formData.phone,
          sarpas_code: formData.sarpas_code,
          crbm: formData.crbm,
          unit: formData.unit,
          license: formData.license,
          role: formData.role,   // Atualiza Admin/Piloto
          status: formData.status // Atualiza Ativo/Inativo
        });
        alert("Dados do piloto atualizados com sucesso!");

      } else {
        // --- MODO CRIAÇÃO ---
        await base44.auth.createAccount({
          ...formData,
          full_name: formData.full_name || '',
          phone: formData.phone || '',
          email: fullEmail,
          status: 'active',
          password: '123456',
          change_password_required: true,
          terms_accepted: false
        });
        alert("Piloto cadastrado com sucesso! Senha padrão: 123456");
      }

      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error(error);
      
      // Tratamento de erro RLS (Permissão)
      if (error.message && (error.message.includes("policy") || error.message.includes("permission"))) {
         const fixSql = `
-- COPIE E RODE NO SUPABASE SQL EDITOR PARA CORRIGIR PERMISSÕES:
DROP POLICY IF EXISTS "Edição de perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem editar" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin' );
`;
        setSqlError(fixSql);
      } else {
        alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, pilotId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser || currentUser.role !== 'admin') {
        alert("Apenas administradores podem realizar esta ação.");
        return;
    }

    if (pilotId === currentUser.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }

    if (window.confirm("ATENÇÃO: Tem certeza que deseja EXCLUIR este piloto permanentemente?\n\nEsta ação não pode ser desfeita.")) {
      setLoading(true);
      try {
        await base44.entities.Pilot.delete(pilotId);
        await loadData();
      } catch (error) {
        console.error(error);
        alert("Erro ao excluir piloto.");
      } finally {
        setLoading(false);
      }
    }
  };

  const copySqlToClipboard = () => {
    if (sqlError) {
      navigator.clipboard.writeText(sqlError);
      alert("Código SQL copiado!");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      
      {/* SQL FIX MODAL */}
      {sqlError && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="w-full max-w-3xl flex flex-col bg-white border-4 border-red-600 shadow-2xl">
              <div className="p-4 bg-red-600 text-white flex justify-between items-center">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                   <Database className="w-6 h-6" />
                   Erro de Permissão (RLS) - Ação Necessária
                 </h3>
                 <button onClick={() => setSqlError(null)} className="hover:bg-red-700 p-1 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <p className="text-slate-700 font-medium">
                    O Banco de Dados bloqueou a edição.
                    <strong>Solução:</strong> Copie o código abaixo e execute no SQL Editor do Supabase.
                 </p>
                 <div className="relative">
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono border border-slate-700 max-h-64">
                       {sqlError}
                    </pre>
                    <button onClick={copySqlToClipboard} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors"><Copy className="w-4 h-4" /></button>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                 <Button variant="outline" onClick={() => setSqlError(null)}>Fechar</Button>
                 <Button onClick={copySqlToClipboard} className="bg-blue-600 text-white hover:bg-blue-700"><Copy className="w-4 h-4 mr-2" /> Copiar SQL</Button>
              </div>
           </Card>
        </div>
      )}

      {/* HEADER SECTION (Fixed) */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4 md:p-6 space-y-4 shadow-sm z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Pilotos</h1>
          
          {currentUser?.role === 'admin' && (
             <Button onClick={handleNew} className="w-full md:w-auto shadow-md bg-red-700 hover:bg-red-800 text-white h-12 md:h-10 text-lg md:text-sm font-bold">
               <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
               Novo Piloto
             </Button>
           )}
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full">
            <input
              type="text"
              placeholder="Buscar por Nome, CRBM ou SARPAS..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 md:py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 md:top-3" />
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden min-h-[200px]">
          
          {/* DESKTOP TABLE VIEW (> 1024px) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[200px]">Piloto</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[200px]">Lotação (CRBM / BBM)</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[150px]">SARPAS / Licença</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Contato</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentPilots.length > 0 ? (
                  currentPilots.map((pilot) => (
                    <tr key={pilot.id} className={`hover:bg-slate-50 transition-colors ${pilot.status === 'inactive' ? 'bg-slate-50 opacity-75' : ''}`}>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm">
                             {pilot.full_name?.[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 whitespace-normal break-words">{pilot.full_name}</p>
                            <p className="text-xs text-slate-500 whitespace-normal break-all">{pilot.email}</p>
                            <div className="flex gap-2 mt-1">
                               <Badge variant={pilot.role === 'admin' ? 'danger' : 'default'} className="text-[10px]">
                                 {pilot.role === 'admin' ? 'Administrador' : 'Piloto'}
                               </Badge>
                               <Badge variant={pilot.status === 'active' ? 'success' : 'warning'} className="text-[10px]">
                                 {pilot.status === 'active' ? 'Ativo' : 'Inativo'}
                               </Badge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-medium text-slate-900 whitespace-normal">{pilot.unit || 'N/D'}</div>
                        <div className="text-xs text-slate-500 whitespace-normal mt-1">{pilot.crbm || 'N/D'}</div>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded w-fit whitespace-nowrap">SARPAS: {pilot.sarpas_code || '-'}</span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">ANAC: {pilot.license || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-sm">
                         <Button 
                            type="button"
                            variant="outline" 
                            onClick={(e) => handleWhatsApp(pilot.phone, e)}
                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 h-8 px-3 text-xs whitespace-nowrap"
                          >
                            <Phone className="w-3 h-3 mr-2" />
                            WhatsApp
                          </Button>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {currentUser?.role === 'admin' && (
                          <div className="flex items-center gap-2">
                             <Button 
                               variant="outline" 
                               onClick={() => handleEdit(pilot)}
                               className="px-2 py-1 h-8 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                               title="Editar Perfil"
                             >
                               <Pencil className="w-4 h-4 mr-1" /> Editar
                             </Button>
                             <Button 
                               variant="outline"
                               onClick={(e) => handleDelete(e, pilot.id)}
                               title="Excluir Piloto"
                               className="px-2 py-1 h-8 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                             >
                                <Trash2 className="w-4 h-4 mr-1" /> Excluir
                             </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                      Nenhum piloto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE & TABLET CARD VIEW (< 1024px) */}
          <div className="lg:hidden p-3 bg-slate-50/50">
            {currentPilots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentPilots.map((pilot) => (
                  <div 
                    key={pilot.id} 
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
                    onClick={() => currentUser?.role === 'admin' ? handleEdit(pilot) : null}
                  >
                      {/* Status Indicator Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${pilot.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>

                      {/* Avatar Column */}
                      <div className="shrink-0">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl border border-slate-200">
                              {pilot.full_name?.[0].toUpperCase()}
                          </div>
                      </div>
                      
                      {/* Content Column */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                          
                          {/* Top: Name & Email */}
                          <div className="mb-2">
                              <h3 className="font-bold text-slate-900 text-sm leading-tight mb-0.5 break-words">{pilot.full_name}</h3>
                              <div className="flex items-center gap-1 text-slate-500 text-xs mb-1.5">
                                 <Mail className="w-3 h-3 shrink-0" />
                                 <span className="truncate">{pilot.email.split('@')[0]}</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-1.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${pilot.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                      {pilot.role === 'admin' ? 'Admin' : 'Piloto'}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                                      {pilot.sarpas_code || 'S/ SARPAS'}
                                  </span>
                              </div>
                          </div>

                          {/* Bottom: Location & Actions */}
                          <div className="flex items-end justify-between border-t border-slate-100 pt-2 mt-auto">
                              <div className="flex flex-col min-w-0 pr-2">
                                  <p className="text-xs font-bold text-slate-800 leading-tight truncate" title={pilot.unit}>{pilot.unit?.split(' - ')[0] || 'N/D'}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate" title={pilot.crbm}>{pilot.crbm?.split(' - ')[0] || ''}</p>
                              </div>
                              
                              {/* Mobile Actions */}
                              <div className="flex gap-2 shrink-0">
                                  <button 
                                    onClick={(e) => handleWhatsApp(pilot.phone, e)}
                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                    title="WhatsApp"
                                  >
                                     <Phone className="w-4 h-4" />
                                  </button>
                                  {currentUser?.role === 'admin' && (
                                    <>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(pilot); }}
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Editar"
                                      >
                                         <Pencil className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => handleDelete(e, pilot.id)}
                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Excluir"
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 italic bg-white rounded-xl border border-slate-200">
                  Nenhum piloto encontrado.
              </div>
            )}
          </div>

          {/* PAGINATION FOOTER */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
             <span className="text-xs text-slate-500 hidden sm:inline">
               Mostrando {currentPilots.length} de {filteredPilots.length} registros
             </span>
             <span className="text-xs text-slate-500 sm:hidden font-medium">
               Pág {currentPage} de {totalPages || 1}
             </span>
             <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={prevPage} 
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0 md:h-8 md:w-8 bg-white"
                >
                  <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={nextPage} 
                  disabled={currentPage >= totalPages}
                  className="h-9 w-9 p-0 md:h-8 md:w-8 bg-white"
                >
                  <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                {editingPilotId ? 'Editar Piloto' : 'Cadastrar Novo Piloto'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {!editingPilotId && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-3 text-sm text-yellow-800">
                  <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção:</span> Este usuário será criado com a senha padrão <strong>123456</strong>. 
                    No primeiro acesso, será obrigatória a alteração da senha.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Nome Completo" 
                  placeholder="Ex: João Pereira"
                  required 
                  value={formData.full_name || ''} 
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                />
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">E-mail Institucional</label>
                  <div className={`flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition-all ${editingPilotId ? 'bg-slate-100 opacity-70' : ''}`}>
                    <input 
                      className="w-full px-3 py-2 outline-none text-right"
                      placeholder="nome.sobrenome"
                      required 
                      value={emailPrefix} 
                      onChange={e => setEmailPrefix(e.target.value)}
                      disabled={!!editingPilotId}
                    />
                    <span className="bg-white px-3 py-2 text-slate-500 text-sm font-medium border-l border-slate-300">
                      @cbm.pr.gov.br
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Telefone / WhatsApp" 
                  placeholder="(41) 99999-9999"
                  required 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
                <Input 
                  label="Código SARPAS" 
                  placeholder="BR-0000"
                  required 
                  value={formData.sarpas_code || ''} 
                  onChange={e => setFormData({...formData, sarpas_code: e.target.value})}
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Lotação Operacional
                </h3>
                
                <div className="space-y-4">
                  <Select 
                    label="Comando Regional (CRBM)" 
                    required 
                    value={formData.crbm || ''} 
                    onChange={e => setFormData({...formData, crbm: e.target.value, unit: ''})}
                  >
                    <option value="">Selecione o CRBM...</option>
                    {Object.keys(ORGANIZATION_CHART).map(crbm => (
                      <option key={crbm} value={crbm}>{crbm}</option>
                    ))}
                  </Select>

                  <Select 
                    label="Unidade (BBM / CIBM / BOA)" 
                    disabled={!formData.crbm}
                    value={formData.unit || ''} 
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="">Selecione a Unidade...</option>
                    {formData.crbm && ORGANIZATION_CHART[formData.crbm]?.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="col-span-1">
                   <Input 
                    label="Licença ANAC" 
                    placeholder="Opcional"
                    value={formData.license || ''} 
                    onChange={e => setFormData({...formData, license: e.target.value})}
                  />
                 </div>
                 <div className="col-span-1">
                   <Select 
                      label="Perfil de Acesso" 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                    >
                      <option value="operator">Piloto</option>
                      <option value="admin">Administrador</option>
                    </Select>
                 </div>
                 <div className="col-span-1">
                   <Select 
                      label="Status" 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </Select>
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Salvando..." : (editingPilotId ? "Atualizar Piloto" : "Cadastrar Piloto")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}