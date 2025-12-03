

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '../services/base44Client';
import { Card, Button, Input, Select } from '../components/ui_components';
import { Lock, UserPlus, Shield, AlertTriangle, LogIn, Mail, KeyRound, CheckSquare, X, FileText, UserCog, Database, Copy, CheckCircle } from 'lucide-react';
import { SYSARP_LOGO, ORGANIZATION_CHART, LGPD_TERMS } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // States for Modals
  const [showRegister, setShowRegister] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState<any>(null);
  const [showLgpdModal, setShowLgpdModal] = useState(false);
  
  // State for SQL Fix Modal (Database Error)
  const [sqlError, setSqlError] = useState<string | null>(null);
  // State for SQL Fix Modal (Email Confirmation)
  const [emailFixSql, setEmailFixSql] = useState<string | null>(null);
  
  // Registration Form State
  const [regForm, setRegForm] = useState({
      full_name: '',
      phone: '',
      sarpas_code: '',
      crbm: '',
      unit: '',
      license: '',
      password: '',
      confirmPassword: '',
      terms_accepted: false
  });
  const [regEmailPrefix, setRegEmailPrefix] = useState('');

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordTermsAccepted, setChangePasswordTermsAccepted] = useState(false);

  // Logo Error State
  const [imgError, setImgError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const user = await base44.auth.login(email, password);
      if (user?.change_password_required) {
        setShowChangePassword(user);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const msg = err.message || "";
      
      // Check for generic invalid credential message to allow Portuguese translation
      if (msg.includes("Invalid login credentials")) {
         setLoginError("E-mail ou senha incorretos.");
      } else if (msg.includes("E-mail não confirmado") || msg.includes("Email not confirmed")) {
         setLoginError("E-mail pendente de confirmação.");
         // Trigger the SQL Fix Modal for Email
         const fixSql = `
-- COPIE E RODE NO SUPABASE SQL EDITOR PARA DESATIVAR CONFIRMAÇÃO DE EMAIL:

-- 1. Confirma automaticamente todos os usuários pendentes atuais
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

-- 2. Cria função para confirmar automaticamente novos cadastros
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplica o gatilho
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();
`;
         setEmailFixSql(fixSql);
      } else {
         setLoginError(msg || "Erro ao realizar login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.password !== regForm.confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    if (!regForm.terms_accepted) {
      alert("Você deve aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setLoading(true);
    try {
      const fullEmail = `${regEmailPrefix}@cbm.pr.gov.br`;
      
      await base44.auth.createAccount({
        ...regForm,
        full_name: regForm.full_name,
        email: fullEmail,
      });

      alert("Solicitação de cadastro enviada! Faça o login com o e-mail e senha criados.");
      setShowRegister(false);
      
      // Limpa formulário
      setRegForm({
        full_name: '', phone: '', sarpas_code: '', crbm: '', unit: '', license: '',
        password: '', confirmPassword: '', terms_accepted: false
      });
      setRegEmailPrefix('');

    } catch (err: any) {
      // Check for the specific database error that requires SQL fix
      if (err.message && err.message.includes("SQL FIX REQUIRED")) {
         // SOLUÇÃO DEFINITIVA: REMOVER O GATILHO QUE ESTÁ TRAVANDO O CADASTRO
         // Já que o sistema Base44 possui lógica interna para criar o perfil,
         // o gatilho de banco de dados tornou-se redundante e problemático.
         const fixSql = `
-- COPIE E RODE NO SUPABASE SQL EDITOR PARA DESTRAVAR O CADASTRO:

-- 1. REMOVE O GATILHO DE BANCO DE DADOS (Causa do erro "Database error saving new user")
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. GARANTE QUE A TABELA DE PERFIS ACEITE DADOS
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS sarpas_code text,
ADD COLUMN IF NOT EXISTS crbm text,
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS license text,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- 3. PERMISSÕES PARA O APP CRIAR O PERFIL DIRETAMENTE
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 4. ATUALIZA SCHEMA
NOTIFY pgrst, 'reload schema';
`;
         setSqlError(fixSql);
      } else {
         alert(`Erro no cadastro: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmNewPassword) {
        alert("As senhas não coincidem.");
        return;
      }
      if (!changePasswordTermsAccepted) {
        alert("Você deve aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
        return;
      }

      setLoading(true);
      try {
        await base44.auth.changePassword(showChangePassword.id, newPassword);
        alert("Senha alterada com sucesso! Você será redirecionado para o Dashboard.");
        navigate('/');
      } catch (err) {
        alert("Erro ao alterar senha.");
      } finally {
        setLoading(false);
      }
  };

  const copySqlToClipboard = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert("Código SQL copiado para a área de transferência!");
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-sysarp-dark via-sysarp-primary to-sysarp-dark flex flex-col items-center justify-center p-4">
      
      {/* SQL FIX MODAL (Database Error) */}
      {sqlError && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="w-full max-w-3xl flex flex-col bg-white border-4 border-red-600 shadow-2xl">
              <div className="p-4 bg-red-600 text-white flex justify-between items-center">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                   <Database className="w-6 h-6" />
                   Ação Necessária: Desbloqueio de Banco de Dados
                 </h3>
                 <button onClick={() => setSqlError(null)} className="hover:bg-red-700 p-1 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <p className="text-slate-700 font-medium">
                    O Banco de Dados está bloqueando o cadastro devido a um Gatilho (Trigger) conflitante.
                    A solução é <strong>remover o gatilho</strong> e deixar a aplicação gerenciar o cadastro.
                 </p>
                 <div className="relative">
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono border border-slate-700 max-h-64">
                       {sqlError}
                    </pre>
                    <button onClick={() => copySqlToClipboard(sqlError)} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors"><Copy className="w-4 h-4" /></button>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                 <Button variant="outline" onClick={() => setSqlError(null)}>Fechar</Button>
                 <Button onClick={() => copySqlToClipboard(sqlError)} className="bg-blue-600 text-white hover:bg-blue-700"><Copy className="w-4 h-4 mr-2" /> Copiar SQL</Button>
              </div>
           </Card>
        </div>
      )}

      {/* EMAIL FIX MODAL */}
      {emailFixSql && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="w-full max-w-3xl flex flex-col bg-white border-4 border-amber-500 shadow-2xl">
              <div className="p-4 bg-amber-500 text-white flex justify-between items-center">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                   <Mail className="w-6 h-6" />
                   Ação Necessária: Auto-Confirmar E-mails
                 </h3>
                 <button onClick={() => setEmailFixSql(null)} className="hover:bg-amber-600 p-1 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <p className="text-slate-700 font-medium">
                    O Supabase está exigindo confirmação de e-mail, mas o servidor de SMTP não está configurado.
                    Execute este SQL para <strong>aprovar todos os usuários</strong> automaticamente.
                 </p>
                 <div className="relative">
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono border border-slate-700 max-h-64">
                       {emailFixSql}
                    </pre>
                    <button onClick={() => copySqlToClipboard(emailFixSql)} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors"><Copy className="w-4 h-4" /></button>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                 <Button variant="outline" onClick={() => setEmailFixSql(null)}>Fechar</Button>
                 <Button onClick={() => copySqlToClipboard(emailFixSql)} className="bg-amber-600 text-white hover:bg-amber-700"><Copy className="w-4 h-4 mr-2" /> Copiar SQL</Button>
              </div>
           </Card>
        </div>
      )}

      {/* LGPD Modal */}
      {showLgpdModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col bg-white">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-red-600" />
                   Política de Privacidade e Termos de Uso
                 </h3>
                 <button onClick={() => setShowLgpdModal(false)} className="p-1 hover:bg-slate-200 rounded"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-white">
                 {LGPD_TERMS}
              </div>
              <div className="p-4 border-t bg-slate-50 flex justify-end">
                 <Button onClick={() => setShowLgpdModal(false)}>Fechar</Button>
              </div>
           </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
           <div className="w-28 h-28 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg p-2 border-2 border-white/20">
              {!imgError ? (
                <img 
                  src={SYSARP_LOGO} 
                  className="w-full h-full object-contain" 
                  alt="SYSARP Logo"
                  onError={() => {
                    setImgError(true);
                  }}
                />
              ) : (
                <Shield className="w-16 h-16 text-white" />
              )}
           </div>
           <h1 className="text-4xl font-extrabold text-white tracking-widest uppercase" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>SYSARP</h1>
           <p className="text-red-200 text-xs font-medium uppercase tracking-wider">Sistema de Aeronaves Remotamente Pilotadas</p>
        </div>

        <Card className="p-8 shadow-2xl bg-white/95 backdrop-blur-lg border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center border-b border-slate-200 pb-4">
               <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
               <p className="text-xs text-slate-500 uppercase font-medium">Corpo de Bombeiros Militar do Paraná</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 animate-fade-in">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm font-bold text-red-700">{loginError}</span>
              </div>
            )}

            <div className="space-y-4">
              <Input 
                label="E-mail Institucional" 
                value={email} 
                onChange={e => setEmail(e.target.value.toLowerCase())} 
                placeholder="ex: nome@bm.pr.gov.br ou admin"
                type="email"
                required
                className="lowercase"
              />
              <Input 
                label="Senha" 
                type="password"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>

            <div className="pt-2 space-y-3">
               <Button type="submit" disabled={loading} className="w-full h-12 font-bold text-lg shadow-lg shadow-red-500/30">
                  <LogIn className="w-5 h-5 mr-2" />
                  {loading ? 'Entrando...' : 'Acessar Sistema'}
               </Button>
               <Button type="button" variant="outline" className="w-full h-12" onClick={() => setShowRegister(true)}>
                  <UserPlus className="w-4 h-4 mr-2"/> Solicitar Cadastro de Piloto
               </Button>
            </div>
          </form>
        </Card>
        
        <p className="text-center text-red-200/50 text-xs mt-8">© {new Date().getFullYear()} SYSARP - CBMPR</p>
      </div>

      {/* --- MODAL DE CADASTRO --- */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-600" />
                Solicitar Cadastro de Piloto
              </h2>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              
              <div className="w-full">
                  <Input 
                    label="Nome Completo" 
                    value={regForm.full_name} 
                    onChange={e => setRegForm({...regForm, full_name: e.target.value})}
                    placeholder="Ex: João Pereira"
                    required
                  />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">E-mail Institucional</label>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500">
                  <Input 
                    className="flex-1 text-right !border-0 !ring-0 rounded-r-none lowercase" 
                    placeholder="nome.sobrenome"
                    value={regEmailPrefix}
                    onChange={e => setRegEmailPrefix(e.target.value.toLowerCase())}
                    required
                  />
                  <span className="bg-white px-3 py-2 text-slate-500 border-l">@cbm.pr.gov.br</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Telefone" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} placeholder="(41) 99999-9999" required />
                <Input label="Código SARPAS" value={regForm.sarpas_code} onChange={e => setRegForm({...regForm, sarpas_code: e.target.value})} placeholder="BR-XXXXXX" required />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border">
                 <h3 className="text-sm font-bold mb-3">Lotação</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <Select label="CRBM" value={regForm.crbm} onChange={e => setRegForm({...regForm, crbm: e.target.value, unit: ''})} required>
                       <option value="">Selecione o CRBM</option>
                       {Object.keys(ORGANIZATION_CHART).map(crbm => <option key={crbm} value={crbm}>{crbm}</option>)}
                    </Select>
                    <Select label="Unidade (BBM/CIBM/BOA)" value={regForm.unit} disabled={!regForm.crbm} onChange={e => setRegForm({...regForm, unit: e.target.value})}>
                       <option value="">Selecione a Unidade</option>
                       {regForm.crbm && ORGANIZATION_CHART[regForm.crbm]?.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </Select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Senha" type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} required />
                <Input label="Confirmar Senha" type="password" value={regForm.confirmPassword} onChange={e => setRegForm({...regForm, confirmPassword: e.target.value})} required />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-0.5" checked={regForm.terms_accepted} onChange={e => setRegForm({...regForm, terms_accepted: e.target.checked})} />
                  <span className="text-sm text-blue-800">
                    Li e concordo com a <button type="button" onClick={() => setShowLgpdModal(true)} className="font-bold underline hover:text-blue-600">Política de Privacidade e Termos de Uso</button> do SYSARP.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowRegister(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Solicitar Cadastro"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* --- MODAL DE ALTERAÇÃO DE SENHA --- */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
           <Card className="w-full max-w-md p-6 shadow-2xl animate-fade-in">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><KeyRound className="w-6 h-6 text-red-600"/> Alteração de Senha Obrigatória</h2>
              <p className="text-sm text-slate-600 mb-4">Por segurança, você deve definir uma nova senha pessoal para seu primeiro acesso.</p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                 <Input label="Nova Senha" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                 <Input label="Confirmar Nova Senha" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required />
                 
                 <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-2">
                   <label className="flex items-start gap-3 cursor-pointer">
                     <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-0.5" checked={changePasswordTermsAccepted} onChange={e => setChangePasswordTermsAccepted(e.target.checked)} />
                     <span className="text-sm text-blue-800">
                       Eu li e aceito a <button type="button" onClick={() => setShowLgpdModal(true)} className="font-bold underline hover:text-blue-600">Política de Privacidade e Termos de Uso</button>.
                     </span>
                   </label>
                 </div>
                 
                 <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Definir Senha e Acessar"}</Button>
                 </div>
              </form>
           </Card>
        </div>
      )}
    </div>
  );
}