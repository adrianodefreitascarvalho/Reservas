import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

interface ReservationStats {
  date: string;
  total_amount: number | null;
  deposit_amount: number | null;
  status: string;
  deposit_status: string;
}

export default function StatisticsReceipts() {
  const { data: chartData, isLoading, error: queryError } = useQuery({
    queryKey: ["statistics-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("date, total_amount, deposit_amount, status, deposit_status")
        .neq("status", "cancelled");

      if (error) {
        console.error("Erro na query de estatísticas:", error);
        throw error;
      }

      const monthlyData: Record<string, { month: string, receita: number, caucoes: number }> = {};

      (data as unknown as ReservationStats[])?.forEach((res) => {
        const date = parseISO(res.date);
        const monthKey = format(date, "yyyy-MM");
        const monthLabel = format(date, "MMM yyyy", { locale: pt });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthLabel, receita: 0, caucoes: 0 };
        }

        if (res.status === 'confirmed') {
          monthlyData[monthKey].receita += Number(res.total_amount || 0);
        }

        if (res.deposit_status === 'paid') {
          monthlyData[monthKey].caucoes += Number(res.deposit_amount || 0);
        }
      });

      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, value]) => value);
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Estatísticas de Receitas</h2>
        <p className="text-muted-foreground">
          Visualização mensal dos fluxos financeiro de reservas do clube.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas e Cauções Pagas</CardTitle>
            <CardDescription>
              Comparação entre o total faturado (confirmadas) e o montante recebido em cauções.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-112.5 w-full mt-4">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  A carregar dados estatísticos...
                </div>
              ) : queryError ? (
                <div className="h-full w-full flex items-center justify-center text-destructive">
                  Erro ao carregar dados. Verifique se a coluna 'total_amount' existe no Supabase.
                </div>
              ) : chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}€`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: number) => [`${value.toFixed(2)}€`]}
                    />
                    <Legend verticalAlign="top" align="right" height={36}/>
                    <Bar dataKey="receita" name="Reservas Confirmadas" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="caucoes" name="Cauções Pagas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}