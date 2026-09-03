"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function TabsDemo() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="np-caps text-[10px] text-muted-foreground">default (inverted)</p>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-3 text-muted-foreground">
            Income minus commitments, in one confident number.
          </TabsContent>
          <TabsContent value="budget" className="pt-3 text-muted-foreground">
            Track spend against category limits.
          </TabsContent>
          <TabsContent value="goals" className="pt-3 text-muted-foreground">
            Marriage, house, retirement — timelined.
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <p className="np-caps text-[10px] text-muted-foreground">line</p>
        <Tabs defaultValue="overview">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-3 text-muted-foreground">
            Income minus commitments, in one confident number.
          </TabsContent>
          <TabsContent value="budget" className="pt-3 text-muted-foreground">
            Track spend against category limits.
          </TabsContent>
          <TabsContent value="goals" className="pt-3 text-muted-foreground">
            Marriage, house, retirement — timelined.
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
