
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart'; // Using Shadcn UI chart components
import { CheckCircle, AlertTriangle, HelpCircle, Eye } from 'lucide-react'; // Added Eye for Admin title

interface Report {
  id: string;
  latitude: string;
  longitude: string;
  photoUrl?: string;
  photoFileName?: string;
  status: 'identified' | 'doubtful' | 'not_yet_identified';
  description: string;
  timestamp: Date;
}

const statusText = {
  identified: "Identified",
  doubtful: "Doubtful",
  not_yet_identified: "Not Yet Identified",
};

const statusColors = {
  identified: "hsl(var(--chart-1))", // Electric Blue (accent)
  doubtful: "hsl(var(--chart-2))",   // Safety Orange (primary)
  not_yet_identified: "hsl(var(--chart-5))", // A distinct color from theme
}

const chartConfig = {
  count: {
    label: 'Reports',
  },
  identified: {
    label: statusText.identified,
    color: statusColors.identified,
  },
  doubtful: {
    label: statusText.doubtful,
    color: statusColors.doubtful,
  },
  not_yet_identified: {
    label: statusText.not_yet_identified,
    color: statusColors.not_yet_identified,
  },
} satisfies ChartConfig;


export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [clientMounted, setClientMounted] = useState(false);

  useEffect(() => {
    setClientMounted(true);
    const storedReports = localStorage.getItem('cableReports');
    if (storedReports) {
      try {
        setReports(JSON.parse(storedReports).map((report: any) => ({ ...report, timestamp: new Date(report.timestamp) })));
      } catch (error) {
        console.error("Failed to parse reports for admin dashboard", error);
      }
    }
  }, []);

  const reportCounts = React.useMemo(() => {
    if (!clientMounted) return { identified: 0, doubtful: 0, not_yet_identified: 0 };
    return reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, { identified: 0, doubtful: 0, not_yet_identified: 0 } as Record<Report['status'], number>);
  }, [reports, clientMounted]);

  const chartData = [
    { status: statusText.identified, count: reportCounts.identified, fill: statusColors.identified },
    { status: statusText.doubtful, count: reportCounts.doubtful, fill: statusColors.doubtful },
    { status: statusText.not_yet_identified, count: reportCounts.not_yet_identified, fill: statusColors.not_yet_identified },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="font-headline text-4xl font-bold text-foreground flex items-center">
          <Eye className="mr-3 h-10 w-10 text-primary" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground font-body">Overview of cable anomaly report statuses.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-400" /> Total Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{clientMounted ? reportCounts.identified : '...'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-yellow-400" /> Total Doubtful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{clientMounted ? reportCounts.doubtful : '...'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-orange-400" /> Total Not Yet Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{clientMounted ? reportCounts.not_yet_identified : '...'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Report Status Distribution</CardTitle>
          <CardDescription className="font-body">Number of reports by identification status.</CardDescription>
        </CardHeader>
        <CardContent>
          {clientMounted && reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No report data available to display chart.</p>
          ) : (
            <div className="h-[400px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      content={<ChartTooltipContent indicator="dot" hideLabel />}
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    />
                    <Legend content={({ payload }) => (
                      <ul className="flex justify-center gap-4 mt-4">
                        {payload?.map((entry: any, index: number) => (
                           <li key={`item-${index}`} className="flex items-center text-sm font-body text-muted-foreground">
                             <span style={{ backgroundColor: entry.color, width: '10px', height: '10px', display: 'inline-block', marginRight: '5px', borderRadius: '50%' }}></span>
                             {entry.value} ({entry.payload.value})
                           </li>
                         ))}
                      </ul>
                    )} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
