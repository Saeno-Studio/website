/**
 * Project list: edit this file to add, remove or reorder projects.
 *
 * Fields
 *  name      Project name shown in the list
 *  url       External link (opens in a new tab)
 *  category  Short label (e.g. "Sports app")
 *  year      Year or range (optional, leave '' to hide)
 *  status    Short status shown when no year is set (e.g. 'Live')
 *  summary   One sentence shown under the name
 *  tags      Small labels
 *  image     Optional screenshot (assets/img/projects/…), for later use
 */
export const projects = [
  {
    name: 'SK00R',
    url: 'https://skoor.it',
    category: 'Sports scoring app',
    year: '', // fill in the launch year
    status: 'Live',
    summary: 'Score racket and team sports from your phone or smartwatch, with club scheduling, fair matchmaking and live scores on the hall TV.',
    tags: ['Mobile', 'Smartwatch', 'Clubs'],
    image: '', // e.g. 'assets/img/projects/skoor.webp'
  },
  // {
  //   name: 'Next project',
  //   url: 'https://example.com',
  //   category: 'Web platform',
  //   year: '2026',
  //   summary: 'One sentence about what it does.',
  //   tags: ['Web'],
  //   image: 'assets/img/projects/next.webp',
  // },
];
