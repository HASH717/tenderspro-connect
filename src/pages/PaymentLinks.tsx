import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

interface PaymentLink {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

const PaymentLinks = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: paymentLinks, isLoading } = useQuery({
    queryKey: ["payment-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PaymentLink[];
    },
  });

  const createPaymentLink = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment link");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      toast({
        title: "Success",
        description: "Payment link created successfully",
      });
      setName("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a name for the payment link",
      });
      return;
    }
    createPaymentLink.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-primary mb-8">Payment Links</h1>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter payment link name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter payment link description"
              />
            </div>

            <Button
              type="submit"
              disabled={createPaymentLink.isPending}
              className="w-full"
            >
              {createPaymentLink.isPending ? "Creating..." : "Create Payment Link"}
            </Button>
          </form>

          <div className="space-y-4">
            {isLoading ? (
              <p>Loading payment links...</p>
            ) : paymentLinks?.length === 0 ? (
              <p>No payment links found</p>
            ) : (
              paymentLinks?.map((link) => (
                <div
                  key={link.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <h3 className="font-medium">{link.name}</h3>
                  {link.description && (
                    <p className="text-sm text-gray-600">{link.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Created:{" "}
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        link.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {link.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentLinks;