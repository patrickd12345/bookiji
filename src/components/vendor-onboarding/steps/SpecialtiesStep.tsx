import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { SpecialtyTreeSelect } from '@/components/SpecialtyTreeSelect'
import { VendorFormData } from '../types'

type Props = {
  data: VendorFormData
  onChange: (updates: Partial<VendorFormData>) => void
}

export function SpecialtiesStep({ data, onChange }: Props) {
  const addSpecialty = (specialtyId: string, specialtyName: string) => {
    if (!data.specialties.find(s => s.id === specialtyId)) {
      onChange({
        specialties: [...data.specialties, { id: specialtyId, name: specialtyName }]
      })
    }
  }

  const removeSpecialty = (specialtyId: string) => {
    onChange({
      specialties: data.specialties.filter(s => s.id !== specialtyId)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Specialties *</CardTitle>
        <p className="text-sm text-gray-600">Select the services you provide. You can choose multiple specialties.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <SpecialtyTreeSelect
          value=""
          onChangeAction={addSpecialty}
          placeholder="Search and select specialties..."
          className="w-full"
        />

        {data.specialties.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Selected Specialties:</label>
            <div className="flex flex-wrap gap-2">
              {data.specialties.map((specialty, index) => (
                <Badge key={specialty.id} variant="default" className="flex items-center space-x-2">
                  <span>{specialty.name}</span>
                  {index === 0 && <span className="text-xs">(Primary)</span>}
                  <button
                    type="button"
                    onClick={() => removeSpecialty(specialty.id)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
