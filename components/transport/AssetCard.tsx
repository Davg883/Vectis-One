import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, AlertCircle, Check, Clock } from "lucide-react";
import { AssetDetailsSheet } from "./AssetDetailsSheet";
import { Id } from "@/convex/_generated/dataModel";

interface AssetCardProps {
  id: Id<"assets">;
  reg: string;
  make: string;
  model: string;
  status: string;
  compliance: any;
  tech: any;
}

export function AssetCard({ id, reg, make, model, status, compliance, tech }: AssetCardProps) {
  
  return (
    <Card className={`w-full border-l-4 shadow-sm ${status === 'grounded' ? 'border-l-[var(--color-status-critical)] bg-red-50/30' : 'border-l-[var(--color-status-good)]'}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${status === 'grounded' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{reg}</h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{make} {model} • {tech.tankCode || "N/A"}</p>
          </div>
        </div>
        <Badge variant={status === 'operational' ? 'default' : 'destructive'} className="uppercase text-[10px]">
          {status}
        </Badge>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* High Density 6-Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 my-4">
            <StatusItem label="MOT" date={compliance.motExpiry} />
            <StatusItem label="PMI (Safety)" date={compliance.pmiNextDue} />
            <StatusItem label="ADR (Haz)" date={compliance.adrExpiry} />
            <StatusItem label="Tacho Cal." date={compliance.tachoExpiry || compliance.tachographCalibrationExpiry} />
            <StatusItem label="Tank Test" date={compliance.tankTestExpiry} />
            <StatusItem label="SLP (Terminal)" date={compliance.slpExpiry} />
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
            {/* The Drill Down Button */}
            <AssetDetailsSheet assetId={id} reg={reg} /> 
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, date }: { label: string, date?: number }) {
    if (!date) return (
         <div className="flex flex-col opacity-50">
            <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
            <span className="text-xs font-mono text-slate-400">N/A</span>
         </div>
    );

    const now = Date.now();
    const daysDiff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    const isExpired = daysDiff < 0;
    const isWarning = daysDiff < 30 && !isExpired;

    return (
        <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
            <div className="flex items-center gap-1.5">
                {isExpired ? (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                ) : isWarning ? (
                    <Clock className="w-3 h-3 text-orange-500" />
                ) : (
                    <Check className="w-3 h-3 text-green-600" />
                )}
                <span className={`text-xs font-mono font-medium ${isExpired ? 'text-red-700' : isWarning ? 'text-orange-600' : 'text-slate-700'}`}>
                    {new Date(date).toLocaleDateString('en-GB')}
                </span>
            </div>
        </div>
    )
}
