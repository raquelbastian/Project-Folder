"use client";

import { AlertTriangle, Bus, Plane, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TransportLeg } from "@/lib/schemas/itinerary";
import { cn, formatCurrency, formatTransportEstimate } from "@/lib/utils";

const modeIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  ferry: <Ship className="h-4 w-4" />,
  boat: <Ship className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  van: <Bus className="h-4 w-4" />,
};

function riskBadgeVariant(flag: TransportLeg["risk_flag"]) {
  switch (flag) {
    case "tight_connection":
      return "warning" as const;
    case "unverified":
      return "danger" as const;
    default:
      return "success" as const;
  }
}

function riskLabel(flag: TransportLeg["risk_flag"]) {
  switch (flag) {
    case "tight_connection":
      return "Tight connection";
    case "unverified":
      return "Unverified";
    default:
      return "Verified";
  }
}

interface TransportLegsProps {
  legs: TransportLeg[];
}

export function TransportLegs({ legs }: TransportLegsProps) {
  if (legs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Transport
      </h4>
      <div className="space-y-2">
        {legs.map((leg, i) => (
          <div
            key={`${leg.origin}-${leg.destination}-${i}`}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
              leg.risk_flag !== "none" && "border-amber-200 bg-amber-50/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-secondary p-1.5 text-secondary-foreground">
                {modeIcons[leg.mode] ?? <Bus className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-medium capitalize">
                  {leg.mode}: {leg.origin} → {leg.destination}
                </p>
                <p className="text-sm text-muted-foreground">
                   {/* {formatTransportEstimate(leg.departure_estimate)} – {formatTransportEstimate(leg.arrival_estimate)} */}
                  {leg.operator_name && `  ${leg.operator_name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              {leg.cost_estimate > 0 && (
                <span className="text-sm font-semibold">{formatCurrency(leg.cost_estimate)}</span>
              )}
              <Badge variant={riskBadgeVariant(leg.risk_flag)}>{riskLabel(leg.risk_flag)}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WarningsList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        <span>Heads up</span>
      </div>
      <ul className="space-y-1 text-sm text-amber-800">
        {warnings.map((w, i) => (
          <li key={i}>• {w}</li>
        ))}
      </ul>
    </div>
  );
}
