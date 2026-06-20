"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MeView } from "@/lib/query/queries/use-me";

type MembershipInfoProps = {
  user: MeView;
};

export function MembershipInfo({ user }: MembershipInfoProps) {
  if (!user.memberships || user.memberships.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keanggotaan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.memberships.map((membership) => (
          <div key={membership.tenant_id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{membership.tenant_name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {membership.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
