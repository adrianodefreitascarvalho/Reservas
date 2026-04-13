import React, { useEffect, useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRooms } from "@/hooks/useRooms";

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
  menu_choice: string;
  deposit_amount: number;
  deposit_status: 'pending' | 'paid' | 'returned';
  status: 'pending' | 'confirmed' | 'cancelled';
  observations?: string;
  admin_observations?: string;
}

interface BookingFormProps {
  defaultValues?: Partial<BookingFormValues>;
  onSubmit: (data: BookingFormValues) => void;
  userRole?: string | null;
}

export function BookingForm({ defaultValues, onSubmit, userRole }: BookingFormProps) {
  const { data: rooms } = useRooms();
  const form = useForm<BookingFormValues>({
    defaultValues: {
      num_people: 1,
      menu_price: 0,
      total_amount: 0,
      responsible_name: "",
      room_id: "",
      date: "",
      start_time: "",
      end_time: "",
      event_type: "",
      contact: "",
      menu_choice: "",
      deposit_amount: 0,
      deposit_status: "pending",
      status: "pending",
      observations: "",
      admin_observations: "",
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

  const handleFormSubmit = (data: BookingFormValues) => {
    // Criamos uma cópia dos dados para manipular
    const filteredData: Record<string, any> = { ...data };

    // Se o utilizador não for admin/direção, removemos campos sensíveis para evitar erro de RLS no Supabase
    if (userRole !== 'admin' && userRole !== 'direction') {
      delete filteredData.admin_observations;
      // O Operador nunca deve tentar definir ou alterar o status manualmente para evitar o erro de permissão
      delete filteredData.status;
    }

    onSubmit(filteredData as BookingFormValues);
  };

  const isAdmin = userRole === 'admin';
  const isDirection = userRole === 'direction';
  const isReadOnly = isDirection;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <FormField
            control={form.control}
            name="room_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sala</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione a sala" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora Início</FormLabel>
                <FormControl>
                  <Input type="time" {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora Fim</FormLabel>
                <FormControl>
                  <Input type="time" {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="responsible_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do responsável" {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="event_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Evento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Almoço, Reunião..." {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="num_people"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nº Pessoas</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    {...field} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.valueAsNumber)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contacto</FormLabel>
                <FormControl>
                  <Input placeholder="Telefone ou Email" {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deposit_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Caução (€)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    {...field}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.valueAsNumber)} 
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deposit_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado da Caução</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="pending">Não Paga</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="returned">Devolvida</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="menu_choice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Menu Contratado</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Buffet, Coffee Break..." {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="menu_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Menu (€)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    {...field}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.valueAsNumber)} 
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total (€)</FormLabel>
                <FormControl>
                  <Input 
                    value={new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(field.value || 0)} 
                    disabled 
                    className="bg-slate-50 font-bold text-primary" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Observações (Operador)</FormLabel>
                <FormControl>
                  <Input placeholder="Notas adicionais sobre a reserva" {...field} disabled={isReadOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {(isAdmin || isDirection) && (
            <FormField
              control={form.control}
              name="admin_observations"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Observações (Admin)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Notas visíveis apenas para administração" 
                      {...field} 
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button type="submit" className="w-full">
          {defaultValues?.responsible_name ? "Atualizar Reserva" : "Confirmar Nova Reserva"}
        </Button>
      </form>
    </Form>
  );
}