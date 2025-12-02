
import React, { useState } from 'react';
import { operationSummerService } from '../services/operationSummerService';
import { base44 } from '../services/base44Client';
import { Card, Button } from '../components/ui_components';
import { FileText, Download, Sun } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SUMMER_MISSION_LABELS } from '../types_summer';

export default function OperationSummerReport() {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const [flights, pilots, drones] = await Promise.all([
        operationSummerService.list(),
        base44.entities.Pilot.list(),
        base44.entities.Drone.list()
      ]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFillColor(249, 115, 22); // Orange for Summer
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE OPERAÇÃO VERÃO", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text("CORPO DE BOMBEIROS MILITAR DO PARANÁ", pageWidth / 2, 22, { align: "center" });

      // Stats Summary
      const totalHours = flights.reduce((acc, f) => acc + (f.flight_duration || 0), 0) / 60;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMO ESTATÍSTICO", 14, 45);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de Voos Registrados: ${flights.length}`, 14, 55);
      doc.text(`Total de Horas Voadas: ${totalHours.toFixed(1)} horas`, 14, 62);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 69);

      // Table
      const tableData = flights.map(f => {
        const pilot = pilots.find(p => p.id === f.pilot_id)?.full_name || 'N/A';
        const drone = drones.find(d => d.id === f.drone_id)?.prefix || 'N/A';
        return [
          new Date(f.date).toLocaleDateString(),
          f.location,
          SUMMER_MISSION_LABELS[f.mission_type] || f.mission_type,
          pilot,
          drone,
          `${f.flight_duration}m`
        ];
      });

      autoTable(doc, {
        startY: 80,
        head: [['Data', 'Local', 'Missão', 'Piloto', 'Drone', 'Duração']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 }
      });
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`SYSARP - Sistema de Aeronaves Remotamente Pilotadas - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
      }

      doc.save(`Relatorio_Op_Verao_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (e) {
      console.error(e);
      alert("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex items-center justify-center h-full bg-slate-100">
      <Card className="p-10 text-center space-y-8 max-w-lg w-full shadow-xl border-t-8 border-orange-500">
        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600 animate-bounce">
          <FileText className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatório Consolidado</h1>
          <p className="text-slate-500 mt-2">Exportação de dados da Operação Verão em formato PDF oficial.</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
          O relatório inclui todas as missões registradas, totalização de horas e detalhes por piloto/aeronave.
        </div>
        <div className="flex justify-center gap-4">
          <Button onClick={generatePDF} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white px-8 h-12 text-lg shadow-lg shadow-orange-200">
            <Download className="w-6 h-6 mr-2" />
            {loading ? "Gerando Documento..." : "Baixar PDF Completo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
