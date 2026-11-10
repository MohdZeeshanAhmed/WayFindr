export const business = {
  name: 'WayFindr',
  tagline: 'Find Your Way to Studying Abroad.',
  email: '',
  phone: '',
  whatsapp: '',
  officeAddress: '',
  businessHours: '',
  social: { instagram: '', linkedin: '', facebook: '' },
  team: [
    { name: 'Your counselor', role: 'Student counselor', bio: 'Add a verified profile and credentials before publishing.' },
  ],
  credentials: [] as string[],
  partnerships: [] as string[],
}

export const isConfigured = (value: string) => value.trim().length > 0