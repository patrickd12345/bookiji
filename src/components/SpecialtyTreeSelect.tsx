"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ArrowLeft, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SpecialtyNode = { 
  id: string; 
  name: string; 
  parent_id: string | null;
  path?: string;
};

type Breadcrumb = { id: string; name: string };

async function fetchChildren(parent: string | null): Promise<SpecialtyNode[]> {
  try {
    const base = `/api/specialties${parent ? `?parent=${parent}` : `?parent=root`}`;
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const json = await res.json();
    return json.items || [];
  } catch (error) {
    console.error("Failed to fetch specialties:", error);
    return [];
  }
}

async function searchSpecialties(q: string): Promise<SpecialtyNode[]> {
  try {
    const res = await fetch(`/api/specialties?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to search");
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
      body: JSON.stringify({ proposed_name: proposedName, parent_id: parentId, details })
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to submit suggestion:", error);
    return false;
  }
}

interface SpecialtyTreeSelectProps {
  value?: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  className?: string;
}

export function SpecialtyTreeSelect({ value, onChange, placeholder = "Select specialty", className }: SpecialtyTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentParent, setCurrentParent] = useState<string | null>(null);
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

  const selectedSpecialty = useMemo(() => {
    if (!value) return null;
    const allSpecialties = [...children, ...searchResults];
    return allSpecialties.find(s => s.id === value);
  }, [value, children, searchResults]);

  useEffect(() => {
    if (isOpen && !currentParent) {
      loadRootSpecialties();
    }
  }, [isOpen, currentParent]);

  const loadRootSpecialties = async () => {
    setIsLoading(true);
    const rootSpecialties = await fetchChildren(null);
    setChildren(rootSpecialties);
    setBreadcrumbs([]);
    setCurrentParent(null);
    setIsLoading(false);
  };

  const loadChildren = async (parentId: string, parentName: string) => {
    setIsLoading(true);
    const childSpecialties = await fetchChildren(parentId);
    setChildren(childSpecialties);
    setCurrentParent(parentId);
    setBreadcrumbs(prev => [...prev, { id: parentId, name: parentName }]);
    setIsLoading(false);
  };

  const navigateToParent = (targetParentId: string) => {
    const targetIndex = breadcrumbs.findIndex(b => b.id === targetParentId);
    if (targetIndex >= 0) {
      const newBreadcrumbs = breadcrumbs.slice(0, targetIndex + 1);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentParent(targetParentId);
      loadChildren(targetParentId, newBreadcrumbs[newBreadcrumbs.length - 1].name);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const results = await searchSpecialties(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelect = (specialty: SpecialtyNode) => {
    onChange(specialty.id, specialty.name);
    setIsOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSuggestionSubmit = async () => {
    if (!suggestionName.trim()) return;
    
    setIsSubmittingSuggestion(true);
    const success = await submitSuggestion(suggestionName.trim(), currentParent || undefined, suggestionDetails.trim());
    
    if (success) {
      setShowSuggestionForm(false);
      setSuggestionName("");
      setSuggestionDetails("");
      // Refresh the current view
      if (currentParent) {
        const parentBreadcrumb = breadcrumbs.find(b => b.id === currentParent);
        if (parentBreadcrumb) {
          loadChildren(currentParent, parentBreadcrumb.name);
        }
      } else {
        loadRootSpecialties();
      }
    }
    
    setIsSubmittingSuggestion(false);
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
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden">
          <CardContent className="p-0">
            {/* Header with breadcrumbs */}
            <div className="border-b p-3">
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
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search specialties..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : searchQuery ? (
                /* Search Results */
                <div className="p-2">
                  {isSearching ? (
                    <div className="p-4 text-center text-muted-foreground">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((specialty) => (
                      <div
                        key={specialty.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => handleSelect(specialty)}
                      >
                        <span>{specialty.name}</span>
                        {value === specialty.id && (
                          <Badge variant="secondary" className="text-xs">Selected</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">No results found</div>
                  )}
                </div>
              ) : (
                /* Tree View */
                <div className="p-2">
                  {children.map((specialty) => (
                    <div key={specialty.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadChildren(specialty.id, specialty.name)}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                        <span
                          className="cursor-pointer flex-1"
                          onClick={() => handleSelect(specialty)}
                        >
                          {specialty.name}
                        </span>
                      </div>
                      {value === specialty.id && (
                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with suggestion button */}
            <div className="border-t p-3">
              {!showSuggestionForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuggestionForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Suggest a new specialty
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="New specialty name"
                    value={suggestionName}
                    onChange={(e) => setSuggestionName(e.target.value)}
                  />
                  <Input
                    placeholder="Details (optional)"
                    value={suggestionDetails}
                    onChange={(e) => setSuggestionDetails(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSuggestionSubmit}
                      disabled={!suggestionName.trim() || isSubmittingSuggestion}
                      className="flex-1"
                    >
                      {isSubmittingSuggestion ? "Submitting..." : "Submit"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuggestionForm(false)}
                      disabled={isSubmittingSuggestion}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


