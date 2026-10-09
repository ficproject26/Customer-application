export function openRespectivePage(navigation: any, item: any) {
  if (!navigation || !item) return;

  const catLower = (item.category || item.categoryKey || '').toLowerCase().trim();
  const nameLower = (item.name || item.title || '').toLowerCase().trim();
  const combined = `${catLower} ${nameLower}`;
  const actionType = item.actionType || '';

  const isJob = combined.includes('job') || combined.includes('employment') || actionType === 'APPLY';
  const isStay = combined.includes('stay') || combined.includes('hotel') || combined.includes('resort') || combined.includes('villa') || actionType === 'BOOK_STAY';
  const isTravel = combined.includes('travel') || combined.includes('flight') || /\bcab\b/i.test(combined) || /\bbus\b/i.test(combined) || combined.includes('train') || combined.includes('tour') || actionType === 'BOOK_TICKET';
  const isService = combined.includes('service') || combined.includes('health') || combined.includes('repair') || combined.includes('clean') || combined.includes('appoint') || actionType === 'BOOK_SERVICE';

  if (isJob) {
    navigation.navigate('JobDetails', { job: item.jobData || item, openApplySheet: true });
  } else if (isStay) {
    navigation.navigate('StayDetails', { stay: item });
  } else if (isTravel) {
    navigation.navigate('CategoryDetails', {
      categoryName: 'Travel',
      subCategoryName: item.subcategory || item.subcategoryName,
      selectedItem: item.name || item.title,
    });
  } else if (isService) {
    navigation.navigate('CategoryDetails', {
      categoryName: 'Services',
      subCategoryName: item.subcategory || item.subcategoryName,
      selectedItem: item.name || item.title,
    });
  } else {
    navigation.navigate('CategoryDetails', {
      categoryName: item.category || item.categoryKey || 'Services',
      selectedItem: item.name || item.title,
    });
  }
}
