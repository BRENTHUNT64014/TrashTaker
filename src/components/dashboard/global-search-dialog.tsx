'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Building2, Users, FileText, CheckSquare, Calendar, Phone, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
}

export function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const modules = [
    { value: 'all', label: 'All Modules', icon: Search },
    { value: 'leads', label: 'Leads', icon: Building2 },
    { value: 'properties', label: 'Properties', icon: Building2 },
    { value: 'contacts', label: 'Contacts', icon: Users },
    { value: 'companies', label: 'Companies', icon: Building2 },
    { value: 'deals', label: 'Deals', icon: FileText },
    { value: 'tasks', label: 'Tasks', icon: CheckSquare },
    { value: 'meetings', label: 'Meetings', icon: Calendar },
    { value: 'calls', label: 'Calls', icon: Phone },
  ];

  // Fetch search results
  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['global-search', debouncedQuery, selectedModule],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(debouncedQuery)}&module=${selectedModule}`
      );
      
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Module selector */}
          <div className="flex items-center gap-3">
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <SelectItem key={module.value} value={module.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{module.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
          </div>

          {/* Search results */}
          <div className="min-h-[300px] max-h-[500px] border rounded-md overflow-y-auto">
            {!searchQuery || searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                <Search className="h-12 w-12 mb-3" />
                <p className="text-sm">Start typing to search (minimum 2 characters)</p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                <Loader2 className="h-8 w-8 mb-3 animate-spin" />
                <p className="text-sm">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                <Search className="h-12 w-12 mb-3" />
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="divide-y">
                {results.map((result) => {
                  const module = modules.find(m => m.value === result.type);
                  const Icon = module?.icon || FileText;
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="mt-0.5">
                        <Icon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1 capitalize">{result.type}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
