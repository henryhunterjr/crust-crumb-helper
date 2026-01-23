import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORIES, QuickResponse } from "@/types/quickResponse";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  trigger_phrases: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface ResponseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<QuickResponse, "id" | "use_count" | "last_used_at" | "created_at" | "updated_at">) => void;
  initialData?: QuickResponse | null;
  isLoading?: boolean;
}

export function ResponseForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  isLoading 
}: ResponseFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "",
      trigger_phrases: initialData?.trigger_phrases?.join(", ") || "",
    },
  });

  // Reset form when initialData changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: initialData?.title || "",
        content: initialData?.content || "",
        category: initialData?.category || "",
        trigger_phrases: initialData?.trigger_phrases?.join(", ") || "",
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = (data: FormData) => {
    const triggerPhrases = data.trigger_phrases
      .split(",")
      .map((phrase) => phrase.trim().toLowerCase())
      .filter((phrase) => phrase.length > 0);

    onSubmit({
      title: data.title,
      content: data.content,
      category: data.category,
      trigger_phrases: triggerPhrases,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Response" : "Add New Response"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title / Trigger Phrase</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., My starter smells like alcohol" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
              name="trigger_phrases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Keywords (comma-separated)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., alcohol, acetone, smells weird" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your response here..." 
                      className="min-h-[200px] resize-y"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : initialData ? "Save Changes" : "Add Response"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
