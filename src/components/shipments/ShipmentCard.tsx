// components/shipments/ShipmentCard.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  shipmentStatusBadge,
  stroopsToUsdc,
  shipmentProgress,
} from '@/lib/utils';
import { ApproximateFiat } from '@/components/ui/ApproximateFiat';
import type { Shipment } from '@/types';

export function ShipmentCard({
  shipment,
  selected,
  onSelect,
}: {
  shipment: Shipment;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}) {
  const progress = shipmentProgress(shipment.milestones);
  const totalUsdc = stroopsToUsdc(shipment.totalAmount);
  const releasedUsdc = stroopsToUsdc(shipment.releasedAmount);

  return (
    <Link
      href={`/dashboard/shipments/${shipment.id}`}
      aria-label={`Shipment ${shipment.id}, ${shipment.status}, $${totalUsdc} total`}
      className="block"
    >
      <div className="card p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {onSelect && (
                <input
                  type="checkbox"
                  checked={Boolean(selected)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelect(!selected);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  aria-label={`Select shipment ${shipment.id}`}
                />
              )}
              <span className="text-sm font-semibold text-gray-900 font-mono">{shipment.id}</span>
              <span className={shipmentStatusBadge(shipment.status)}>{shipment.status}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1.5 justify-end">
              <p className="text-sm font-semibold text-gray-900">${totalUsdc}</p>
              <ApproximateFiat amount={totalUsdc} className="text-xs text-gray-400" />
            </div>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <p className="text-xs text-gray-400">${releasedUsdc} released</p>
              <ApproximateFiat amount={releasedUsdc} className="text-[11px] text-gray-400" />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-full bg-gray-100 rounded-full h-1.5 mb-2"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progress}% complete`}
        >
          <div
            className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {
              shipment.milestones.filter(
                (m) => m.status === 'Confirmed' || m.status === 'Resolved',
              ).length
            }
            /{shipment.milestones.length} milestones done
          </p>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-600 transition-colors" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
