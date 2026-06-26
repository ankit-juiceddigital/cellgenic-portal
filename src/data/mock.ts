import { Client, Order, Note, Rep, UnassignedProvider, CommissionEntry, User } from '@/types'

export const MOCK_USERS: Record<string, User> = {
  rep: { id: '1', name: 'Jamie Santos', initials: 'JS', role: 'sales_rep', repCode: 'JSANTOS' },
  manager: { id: '2', name: 'Rosa Martinez', initials: 'RM', role: 'sales_manager' },
  admin: { id: '3', name: 'Sarah Admin', initials: 'SA', role: 'administrator' },
}

export const CLIENTS: Client[] = [
  { id: 1, name: 'Dr. Maria Gonzalez', clinic: 'Regenerate Miami Clinic', country: 'Mexico', rep: 'Jamie Santos', repCode: 'JSANTOS', lastOrder: 'Jun 12, 2026', totalOrders: 14, ltv: '$18,400', status: 'active', risk: false },
  { id: 2, name: 'Dr. Carlos Reyes', clinic: 'VitaMed Centro', country: 'Colombia', rep: 'Jamie Santos', repCode: 'JSANTOS', lastOrder: 'Jun 1, 2026', totalOrders: 7, ltv: '$9,200', status: 'active', risk: false },
  { id: 3, name: 'Dr. Ana Villanueva', clinic: 'BioRestore Clinic', country: 'Argentina', rep: 'Jamie Santos', repCode: 'JSANTOS', lastOrder: 'Apr 10, 2026', totalOrders: 3, ltv: '$3,600', status: 'at-risk', risk: true },
  { id: 4, name: 'Dr. Luis Mendoza', clinic: 'Salud Avanzada', country: 'Peru', rep: 'Jamie Santos', repCode: 'JSANTOS', lastOrder: 'May 28, 2026', totalOrders: 9, ltv: '$12,100', status: 'active', risk: false },
  { id: 5, name: 'Dr. Sofia Herrera', clinic: 'ClinPlus Bogotá', country: 'Colombia', rep: 'Rachel Kim', repCode: 'RKIM', lastOrder: 'Jun 10, 2026', totalOrders: 11, ltv: '$15,800', status: 'active', risk: false },
  { id: 6, name: 'Dr. Pablo Torres', clinic: 'PrimeSalud', country: 'Mexico', rep: 'Rachel Kim', repCode: 'RKIM', lastOrder: 'Mar 20, 2026', totalOrders: 2, ltv: '$2,100', status: 'at-risk', risk: true },
  { id: 7, name: 'Dr. Elena Vargas', clinic: 'Regen Institute BA', country: 'Argentina', rep: 'Marco Diaz', repCode: 'MDIAZ', lastOrder: 'Jun 8, 2026', totalOrders: 19, ltv: '$28,500', status: 'active', risk: false },
  { id: 8, name: 'Dr. Roberto Solis', clinic: 'BioClinic Lima', country: 'Peru', rep: 'Marco Diaz', repCode: 'MDIAZ', lastOrder: 'Jun 14, 2026', totalOrders: 6, ltv: '$7,900', status: 'active', risk: false },
]

export const ORDERS: Record<number, Order[]> = {
  1: [
    { id: '#CG-4421', date: 'Jun 12, 2026', products: 'BPC-157 × 10, TB-500 × 5', amount: '$1,840', status: 'fulfilled' },
    { id: '#CG-4290', date: 'May 28, 2026', products: 'GHK-CU × 8, Semaglutide × 3', amount: '$2,100', status: 'fulfilled' },
    { id: '#CG-4101', date: 'May 5, 2026', products: 'BPC-157 × 20', amount: '$2,600', status: 'fulfilled' },
    { id: '#CG-3988', date: 'Apr 18, 2026', products: 'NAD+ × 6, TB-500 × 4', amount: '$1,920', status: 'fulfilled' },
  ],
  2: [
    { id: '#CG-4380', date: 'Jun 1, 2026', products: 'BPC-157 × 5, LL-37 × 3', amount: '$1,350', status: 'fulfilled' },
    { id: '#CG-4210', date: 'May 12, 2026', products: 'Semaglutide × 4', amount: '$1,600', status: 'fulfilled' },
  ],
  3: [
    { id: '#CG-3901', date: 'Apr 10, 2026', products: 'GHK-CU × 6', amount: '$1,200', status: 'fulfilled' },
  ],
  4: [
    { id: '#CG-4350', date: 'May 28, 2026', products: 'BPC-157 × 12, NAD+ × 4', amount: '$2,400', status: 'fulfilled' },
    { id: '#CG-4180', date: 'May 1, 2026', products: 'TB-500 × 8', amount: '$1,760', status: 'fulfilled' },
  ],
}

export const NOTES: Record<number, Note[]> = {
  1: [
    { id: 'n1', type: 'call', author: 'Jamie Santos', date: 'Jun 14, 2026', text: 'Called Dr. Gonzalez to check in on BPC-157 stock levels. She mentioned she\'s seeing good results and will likely reorder next week. Follow up Jun 21.' },
    { id: 'n2', type: 'followup', author: 'Jamie Santos', date: 'Jun 10, 2026', text: 'Sent follow-up email about the new Semaglutide vial sizes. Awaiting response.' },
    { id: 'n3', type: 'email', author: 'Jamie Santos', date: 'May 30, 2026', text: 'Introduced the new NAD+ 500mg product line. Shared product spec sheet and COA link.' },
    { id: 'n4', type: 'note', author: 'Jamie Santos', date: 'May 12, 2026', text: 'Client prefers orders on Mondays due to their clinic schedule. Dry-ice overnight shipping preferred.' },
  ],
  2: [
    { id: 'n5', type: 'call', author: 'Jamie Santos', date: 'Jun 2, 2026', text: 'Quick check-in call. Dr. Reyes is happy with current products. Mentioned interest in TB-500 for a new patient protocol.' },
    { id: 'n6', type: 'note', author: 'Jamie Santos', date: 'May 15, 2026', text: 'Best contact time is Tuesday or Wednesday mornings (Colombia time).' },
  ],
  3: [
    { id: 'n7', type: 'followup', author: 'Jamie Santos', date: 'Jun 12, 2026', text: 'No order since April. Sent reactivation email with product updates. Need to follow up with a call if no response by Jun 19.' },
    { id: 'n8', type: 'call', author: 'Jamie Santos', date: 'Apr 11, 2026', text: 'Post-order check-in. Dr. Villanueva said she\'s evaluating budget for Q2. Will reach out again in June.' },
  ],
  4: [
    { id: 'n9', type: 'email', author: 'Jamie Santos', date: 'Jun 1, 2026', text: 'Shared updated peptide calculator link. Dr. Mendoza said his team found it very useful for dosing calculations.' },
    { id: 'n10', type: 'note', author: 'Jamie Santos', date: 'May 5, 2026', text: 'Clinic has 3 physicians on staff. All using BPC-157 and NAD+ regularly. Good upsell potential for GHK-CU.' },
  ],
}

export const REPS: Rep[] = [
  { name: 'Jamie Santos', code: 'JSANTOS', clients: 4, ordersMonth: 12, revenue: '$8,200', commission: '$820', trend: '+14%' },
  { name: 'Rachel Kim', code: 'RKIM', clients: 2, ordersMonth: 7, revenue: '$5,100', commission: '$510', trend: '+3%' },
  { name: 'Marco Diaz', code: 'MDIAZ', clients: 2, ordersMonth: 18, revenue: '$14,600', commission: '$1,460', trend: '+31%' },
]

export const UNASSIGNED: UnassignedProvider[] = [
  { name: 'Dr. Fernanda Ruiz', clinic: 'NovaSalud Clinic', country: 'Mexico', registered: 'Jun 13, 2026' },
  { name: 'Dr. Jorge Campos', clinic: 'BioCentro Perú', country: 'Peru', registered: 'Jun 11, 2026' },
]

export const COMMISSIONS: CommissionEntry[] = [
  { client: 'Dr. Maria Gonzalez', order: '#CG-4421', sale: '$1,840', rate: '10%', amount: '$184' },
  { client: 'Dr. Luis Mendoza', order: '#CG-4350', sale: '$2,400', rate: '10%', amount: '$240' },
  { client: 'Dr. Carlos Reyes', order: '#CG-4380', sale: '$1,350', rate: '10%', amount: '$135' },
]

export const PRODUCTS = [
  'BPC-157 — 5mg vial',
  'TB-500 — 5mg vial',
  'GHK-CU — 50mg vial',
  'Semaglutide — 3mg vial',
  'NAD+ — 500mg vial',
  'LL-37 — 10mg vial',
  'Sermorelin — 5mg vial',
]
