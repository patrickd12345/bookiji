export type DayHours = { open: boolean; start_time: string; end_time: string }

export type VendorFormData = {
  business_name: string
  contact_name: string
  phone: string
  email: string
  description: string
  address: string
  hours: Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', DayHours>
  specialties: Array<{ id: string; name: string }>
}

export type OnboardingStep = 'business_info' | 'specialties' | 'hours' | 'complete'

export const defaultHours = (): VendorFormData['hours'] => ({
  mon:{open:true,start_time:'09:00',end_time:'17:00'},
  tue:{open:true,start_time:'09:00',end_time:'17:00'},
  wed:{open:true,start_time:'09:00',end_time:'17:00'},
  thu:{open:true,start_time:'09:00',end_time:'17:00'},
  fri:{open:true,start_time:'09:00',end_time:'17:00'},
  sat:{open:false,start_time:'09:00',end_time:'17:00'},
  sun:{open:false,start_time:'09:00',end_time:'17:00'},
})

export const initialData: VendorFormData = {
  business_name:'',
  contact_name:'',
  phone:'',
  email:'',
  description:'',
  address:'',
  hours: defaultHours(),
  specialties: []
}
