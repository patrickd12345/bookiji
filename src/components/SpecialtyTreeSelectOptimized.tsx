"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronRight, ArrowLeft, Plus, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type SpecialtyNode = { 
  id: string; 
  name: string; 
  parent_id: string | null;
  path?: string;
  level?: number;
  breadcrumb?: string[];
  is_leaf?: boolean;
};

type Breadcrumb = { id: string; name: string };

interface SpecialtyTreeSelectProps {
  value?: string;
  onChangeAction: (id: string, name: string) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
}

// Cache for specialty data
const specialtyCache = new Map<string, { data: SpecialtyNode[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchSpecialtiesWithCache(parent: string | null, searchQuery?: string): Promise<SpecialtyNode[]> {
  const cacheKey = `specialties:${parent || 'root'}:${searchQuery || ''}`;
  const cached = specialtyCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    let url = `/api/specialties`;
    if (parent === 'root') {
      url += '?parent=root';
    } else if (parent) {
      url += `?parent=${parent}`;
    }
    if (searchQuery) {
      url += `${parent ? '&' : '?'}q=${encodeURIComponent(searchQuery)}`;
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    
    const json = await res.json();
    const data = json.items || [];
    
    // Cache the results
    specialtyCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    console.error("Failed to fetch specialties:", error);
    return [];
  }
}

async function searchSpecialtiesOptimized(q: string): Promise<SpecialtyNode[]> {
  if (q.length < 2) return [];
  
  try {
    const res = await fetch(`/api/specialties?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const json = await res.json();
    return json.items || [];
  } catch (error) {
    console.error("Failed to search specialties:", error);
    return [];
  }
}

async function submitSuggestion(proposedName: string, parentId?: string, details?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/specialties/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: proposedName, parent_id: parentId, details }),
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to submit suggestion:", error);
    return false;
  }
}

export function SpecialtyTreeSelectOptimized({ 
  value, 
  onChangeAction, 
  placeholder = "Select specialty", 
  className,
  maxHeight = "max-h-96"
}: SpecialtyTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentParent, setCurrentParent] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [children, setChildren] = useState<SpecialtyNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpecialtyNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionName, setSuggestionName] = useState("");
  const [suggestionDetails, setSuggestionDetails] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [virtualizedItems, setVirtualizedItems] = useState<SpecialtyNode[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  
  // Create a debounced search query using useEffect and setTimeout
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedSpecialty = useMemo(() => {
    if (!value) return null;
    const allSpecialties = [...children, ...searchResults];
    return allSpecialties.find(s => s.id === value);
  }, [value, children, searchResults]);

  // Virtualization settings
  const itemHeight = 48; // Height of each specialty item
  const visibleItems = 10; // Number of items visible at once
  const totalHeight = children.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItems, children.length);

  useEffect(() => {
    if (isOpen && !currentParent) {
      loadRootSpecialties();
    }
  }, [isOpen, currentParent]);

  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length >= 2) {
      void performSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    // Update virtualized items when children change
    setVirtualizedItems(children.slice(startIndex, endIndex));
  }, [children, startIndex, endIndex]);

  const loadRootSpecialties = async () => {
    setIsLoading(true);
    const rootSpecialties = await fetchSpecialtiesWithCache(null);
    setChildren(rootSpecialties);
    setBreadcrumbs([]);
    setCurrentParent(undefined);
    setIsLoading(false);
  };

  const loadChildren = async (parentId: string, parentName: string) => {
    setIsLoading(true);
    const childSpecialties = await fetchSpecialtiesWithCache(parentId);
    setChildren(childSpecialties);
    setCurrentParent(parentId);
    setBreadcrumbs(prev => [...prev, { id: parentId, name: parentName }]);
    setIsLoading(false);
  };

  const navigateToParent = (targetParentId: string) => {
    const targetIndex = breadcrumbs.findIndex(crumb => crumb.id === targetParentId);
    if (targetIndex !== -1) {
      const targetBreadcrumbs = breadcrumbs.slice(0, targetIndex + 1);
      setBreadcrumbs(targetBreadcrumbs);
      setCurrentParent(targetParentId);
      loadChildren(targetParentId, targetBreadcrumbs[targetBreadcrumbs.length - 1].name);
    }
  };

  const performSearch = async () => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) return;
    
    setIsSearching(true);
    const results = await searchSpecialtiesOptimized(debouncedSearchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSuggestionSubmit = async () => {
    if (!suggestionName.trim()) return;
    
    setIsSubmittingSuggestion(true);
    const success = await submitSuggestion(suggestionName, currentParent, suggestionDetails);
    
    if (success) {
      setShowSuggestionForm(false);
      setSuggestionName("");
      setSuggestionDetails("");
      // Refresh the current view
      if (currentParent) {
        loadChildren(currentParent, breadcrumbs[breadcrumbs.length - 1]?.name || "");
      } else {
        loadRootSpecialties();
      }
    }
    
    setIsSubmittingSuggestion(false);
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
  }, []);

  const renderSpecialtyItem = (specialty: SpecialtyNode, index: number) => {
    const actualIndex = startIndex + index;
    const hasChildren = specialty.level !== undefined && specialty.level < 5; // Assume max depth of 5
    
    return (
      <div
        key={specialty.id}
        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
        style={{ height: itemHeight }}
        onClick={() => {
          if (hasChildren) {
            loadChildren(specialty.id, specialty.name);
          } else {
            onChangeAction(specialty.id, specialty.name);
            setIsOpen(false);
          }
        }}
      >
        <div className="flex items-center space-x-2 flex-1">
          {hasChildren && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-medium">{specialty.name}</span>
          {specialty.path && (
            <Badge variant="outline" className="text-xs">
              {specialty.path.split('.').slice(-2).join(' > ')}
            </Badge>
          )}
        </div>
                 {hasChildren && (
           <span className="text-xs text-gray-500">
             subcategories
           </span>
         )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className={selectedSpecialty ? "" : "text-muted-foreground"}>
          {selectedSpecialty ? selectedSpecialty.name : placeholder}
        </span>
        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden" style={{ maxHeight: maxHeight }}>
          <CardContent className="p-0">
            {/* Header with breadcrumbs */}
            <div className="border-b p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                {breadcrumbs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadRootSpecialties()}
                    className="h-6 px-2"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Root
                  </Button>
                )}
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.id} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToParent(crumb.id)}
                      className="h-6 px-2 text-xs"
                    >
                      {crumb.name}
                    </Button>
                    {index < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
                  </div>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-8 text-sm"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : searchQuery && searchResults.length > 0 ? (
                // Search results
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.map((specialty) => (
                    <div
                      key={specialty.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      onClick={() => {
                        onChangeAction(specialty.id, specialty.name);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{specialty.name}</span>
                        {specialty.path && (
                          <Badge variant="outline" className="text-xs">
                            {specialty.path.split('.').slice(-2).join(' > ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : children.length > 0 ? (
                // Virtualized list for large datasets
                <div 
                  ref={scrollContainerRef}
                  className="overflow-y-auto"
                  style={{ height: Math.min(children.length * itemHeight, 400) }}
                  onScroll={handleScroll}
                >
                  <div style={{ height: totalHeight, position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: startIndex * itemHeight,
                        left: 0,
                        right: 0
                      }}
                    >
                      {virtualizedItems.map((specialty, index) => 
                        renderSpecialtyItem(specialty, index)
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Empty state
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No specialties found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuggestionForm(true)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Suggest New
                  </Button>
                </div>
              )}
            </div>

            {/* Suggestion Form */}
            {showSuggestionForm && (
              <div className="border-t p-4 bg-gray-50">
                <div className="space-y-3">
                  <Input
                    placeholder="New specialty name"
                    value={suggestionName}
                    onChange={(e) => setSuggestionName(e.target.value)}
                  />
                  <Input
                    placeholder="Additional details (optional)"
                    value={suggestionDetails}
                    onChange={(e) => setSuggestionDetails(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSuggestionSubmit}
                      disabled={isSubmittingSuggestion || !suggestionName.trim()}
                    >
                      {isSubmittingSuggestion ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Submit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuggestionForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t p-3 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {children.length} {children.length === 1 ? 'specialty' : 'specialties'}
                  {currentParent && ` in ${breadcrumbs[breadcrumbs.length - 1]?.name}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                  className="h-6 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Suggest
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
