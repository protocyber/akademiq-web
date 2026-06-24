"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MeView } from "@/lib/query/queries/use-me";

type ProfileHeaderProps = {
  user: MeView;
};

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{user.full_name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-1 flex items-center gap-2">
            {user.email_verified ? (
              <Badge variant="default" className="bg-green-600">
                Terverifikasi
              </Badge>
            ) : (
              <Badge variant="secondary">Belum Terverifikasi</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
