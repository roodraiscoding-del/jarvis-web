import React from 'react';
import { AlertTriangle, Trash2, Send, PlusCircle, CheckCircle, X } from 'lucide-react';

export interface ConfirmationDialogState {
  isOpen: boolean;
  type: 'delete' | 'send' | 'create' | 'update';
  service: 'Calendar' | 'Gmail' | 'Docs' | 'Tasks' | 'Contacts' | 'Keep';
  title: string;
  description: string;
  itemDetails?: { label: string; value: string }[];
  confirmButtonText?: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface WorkspaceConfirmationModalProps {
  dialogState: ConfirmationDialogState | null;
  onClose: () => void;
  isExecuting?: boolean;
}

export const WorkspaceConfirmationModal: React.FC<WorkspaceConfirmationModalProps> = ({
  dialogState,
  onClose,
  isExecuting = false
}) => {
  if (!dialogState || !dialogState.isOpen) return null;

  const isDelete = dialogState.type === 'delete' || dialogState.isDestructive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="hud-card-glow rounded-xl max-w-lg w-full p-5 border border-slate-700/80 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isExecuting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2.5 rounded-lg border ${
              isDelete
                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}
          >
            {isDelete ? (
              <Trash2 className="w-5 h-5" />
            ) : dialogState.type === 'send' ? (
              <Send className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Google {dialogState.service}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isDelete
                    ? 'bg-red-950/60 text-red-300 border border-red-800'
                    : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800'
                }`}
              >
                {isDelete ? 'Destructive Action' : 'Direct Mutation'}
              </span>
            </div>
            <h2 className="text-base font-display font-bold text-slate-100 mt-1">
              {dialogState.title}
            </h2>
          </div>
        </div>

        {/* Main description */}
        <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
          {dialogState.description}
        </p>

        {/* Key-Value Details */}
        {dialogState.itemDetails && dialogState.itemDetails.length > 0 && (
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2 mb-5 text-xs font-mono">
            {dialogState.itemDetails.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                <span className="text-slate-400 text-[11px] shrink-0 font-medium">{item.label}:</span>
                <span className="text-slate-200 text-[11px] sm:text-right break-words max-w-[280px]">
                  {item.value || '(None)'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Safeguard prompt */}
        <div className="text-[11px] text-slate-400 mb-5 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Jarvis safety mandate: End-user confirmation is required before proceeding.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800/80 text-xs font-mono text-slate-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await dialogState.onConfirm();
              onClose();
            }}
            disabled={isExecuting}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all shadow-md flex items-center gap-2 ${
              isDelete
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-900/30'
            } disabled:opacity-50`}
          >
            {isExecuting && (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <span>{dialogState.confirmButtonText || (isDelete ? 'Confirm Deletion' : 'Confirm & Proceed')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
