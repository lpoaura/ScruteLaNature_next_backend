import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone } from 'lucide-react';

interface MobileTestModalProps {
  parcoursId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileTestModal({ parcoursId, isOpen, onClose }: MobileTestModalProps) {
  if (!isOpen) return null;

  // The deep link URL that the mobile app will intercept
  const deepLinkUrl = `scrutelanature://parcours/${parcoursId}?preview=true`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-xl">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2 text-indigo-600">
            <Smartphone size={20} />
            <h2 className="font-semibold text-gray-900">Test sur Mobile</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
          <p className="text-sm text-gray-600 text-center mb-6">
            Scannez ce QR Code avec l'appareil photo de votre téléphone pour ouvrir ce parcours directement dans l'application LPO Balades en <strong>Mode Test</strong>.
          </p>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <QRCodeSVG 
              value={deepLinkUrl} 
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
          
          <div className="mt-6 text-xs text-center text-gray-400 bg-gray-50 p-3 rounded-lg w-full break-all">
            <span className="font-semibold text-gray-500 mb-1 block">Lien interne :</span>
            {deepLinkUrl}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
