import React, { useEffect, useMemo } from "react";
import { useForm, useWatch, type ControllerRenderProps } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BookingFormValues {
  num_people: number;
  menu_price: number;
  total_amount: number;
  responsible_name: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  contact: string;
  deposit_amount: number;
  deposit_status: 'pending' | 'paid' | 'returned';
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface BookingFormProps {
  defaultValues?: Partial<BookingFormValues>;
  onSubmit: (data: BookingFormValues) => void;
}

export function BookingForm({ defaultValues, onSubmit }: BookingFormProps) {
  const form = useForm<BookingFormValues>({
    defaultValues: {
      num_people: 0,
      menu_price: 0,
      total_amount: 0,
      responsible_name: "",
      deposit_status: "pending",
      status: "pending",
      ...defaultValues,
    },
  });

  // Observar mudanças em tempo real nos campos de entrada
  const numPeople = useWatch({ control: form.control, name: "num_people" });
  const menuPrice = useWatch({ control: form.control, name: "menu_price" });

  // Cálculo derivado em tempo real para a UI
  const calculatedTotal = useMemo(() => {
    return (numPeople || 0) * (menuPrice || 0);
  }, [numPeople, menuPrice]);

  // Cálculo automático do Total
  useEffect(() => {
    // Sincroniza o valor calculado com o estado do formulário para persistência
    form.setValue("total_amount", calculatedTotal, { shouldDirty: true });
  }, [calculatedTotal, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("total_amount")} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Número de Pessoas */}
          <FormField
            control={form.control}
            name="num_people"
            render={({ field }: { field: ControllerRenderProps<BookingFormValues, "num_people"> }) => (
              <FormItem>
                <FormLabel>Número de Pessoas</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    {...field} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.valueAsNumber)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor do Menu */}
          <FormField
            control={form.control}
            name="menu_price"
            render={({ field }: { field: ControllerRenderProps<BookingFormValues, "menu_price"> }) => (
              <FormItem>
                <FormLabel>Valor do Menu (€)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    {...field} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.valueAsNumber)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Campo: Valor Total (Calculado automaticamente) */}
        <FormField
          control={form.control}
          name="total_amount"
          render={() => (
            <FormItem>
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <FormLabel className="text-base font-semibold text-primary">Valor Total</FormLabel>
                      <p className="text-xs text-muted-foreground">Cálculo: {numPeople || 0} pessoas × {menuPrice || 0}€</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {calculatedTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {defaultValues?.responsible_name ? "Atualizar Reserva" : "Confirmar Nova Reserva"}
        </Button>
      </form>
    </Form>
  );
}