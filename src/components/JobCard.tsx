import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Icons from 'lucide-react-native';
import { useWishlistStore } from '../store/wishlistStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { useAuthGuardStore } from '../store/authGuardStore';

const { width } = Dimensions.get('window');

export interface JobItem {
  id: string;
  jobID?: string;
  title: string;
  company: string;
  companyName?: string;
  companyWebsite?: string;
  logo?: string;
  isVerified?: boolean;
  location: string;
  workMode: 'On-site' | 'Hybrid' | 'Remote' | string;
  experience: string;
  salary: string; // e.g. "₹8–₹14 LPA" or "₹15,000 / mo"
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Apprenticeship' | string;
  department?: string;
  skills: string[];
  postedDate: string;
  deadline?: string;
  itemType?: 'JOB' | 'INTERNSHIP' | string;
  duration?: string; // e.g. "3 Months" for internships
  ppoAvailable?: boolean;
  openings?: number;
  description?: string;
  keyResponsibilities?: string | string[];
  responsibilities?: string | string[];
  companyInfo?: {
    industry?: string;
    size?: string;
    founded?: string;
    hq?: string;
    website?: string;
    rating?: string;
    reviewsCount?: string;
    about?: string;
  };
}

interface JobCardProps {
  job: JobItem;
  onPress?: () => void;
  onApply?: () => void;
}

const JobCardComponent = memo(function JobCard({ job, onPress, onApply }: JobCardProps) {
  const navigation = useNavigation<any>();
  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const showToast = useToastStore((state) => state.showToast);

  const currentUser = useAuthStore((state) => state.currentUser);
  const isGuestUser = !currentUser || currentUser.isGuest || currentUser.id === 'guest_user' || Boolean(currentUser.name && currentUser.name.toLowerCase().includes('guest'));

  const [hasApplied, setHasApplied] = useState(false);

  const isSaved = wishlistItems.some((i) => i.id === job.id);
  const isInternship =
    job.itemType === 'INTERNSHIP' ||
    (job.employmentType || '').toLowerCase().includes('intern');

  const fallbackLogo =
    'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=150&auto=format&fit=crop&q=80';

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('JobDetails', { job });
    }
  };

  const handleApplyPress = () => {
    if (isGuestUser) {
      useAuthGuardStore.getState().showAuthModal('apply for this job position');
      return;
    }
    if (hasApplied) {
      showToast('You have already applied for this role', 'View My Jobs', () =>
        navigation.navigate('CustomerTabs', { screen: 'Orders', params: { category: 'Jobs' } })
      );
      return;
    }

    if (onApply) {
      onApply();
    } else {
      navigation.navigate('JobDetails', { job, openApplySheet: true });
    }
  };

  const handleSaveToggle = () => {
    if (isGuestUser) {
      useAuthGuardStore.getState().showAuthModal('save job bookmarks');
      return;
    }
    toggleWishlist({
      id: job.id,
      name: job.title,
      price: job.salary,
      category: 'Jobs',
      image: job.logo,
    });
    if (!isSaved) {
      showToast('Job saved to your bookmarks', 'View Saved', () =>
        navigation.navigate('Wishlist')
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={handleCardPress}
    >
      {/* Header Row: Title/Company + Save Bookmark */}
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleCol}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitleText} numberOfLines={1}>
              {job.title}
            </Text>
            {isInternship && (
              <View style={styles.internBadge}>
                <Text style={styles.internBadgeText}>INTERNSHIP</Text>
              </View>
            )}
          </View>

          <View style={styles.companyMetaRow}>
            <Text style={styles.companyNameText} numberOfLines={1}>
              {job.companyName || job.company}
            </Text>
            {job.isVerified !== false && (
              <Icons.CheckCircle2 color="#0EA5E9" size={13} style={{ marginLeft: 4 }} />
            )}
            <View style={styles.jobIdBadge}>
              <Text style={styles.jobIdBadgeText}>
                {job.jobID || `JOB-${(job.id || '').replace(/[^\d]/g, '').slice(-5) || '10482'}`}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.7}
          onPress={handleSaveToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icons.Bookmark
            color={isSaved ? '#F5B800' : '#94A3B8'}
            fill={isSaved ? '#F5B800' : 'transparent'}
            size={18}
          />
        </TouchableOpacity>
      </View>

      {/* Specifications Meta Grid */}
      <View style={styles.specsRow}>
        {/* Experience / Duration */}
        <View style={styles.specChip}>
          <Icons.Briefcase color="#64748B" size={12} />
          <Text style={styles.specChipText}>
            {isInternship ? job.duration || '3 Months' : job.experience || '0–2 yrs'}
          </Text>
        </View>

        {/* Salary / Stipend */}
        <View style={styles.specChip}>
          <Icons.IndianRupee color="#059669" size={12} />
          <Text style={[styles.specChipText, { color: '#059669', fontWeight: '700' }]}>
            {job.salary || '₹6–₹12 LPA'}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.specChip}>
          <Icons.MapPin color="#64748B" size={12} />
          <Text style={styles.specChipText} numberOfLines={1}>
            {job.location || 'Bangalore'}
          </Text>
        </View>

        {/* Work Mode */}
        <View
          style={[
            styles.workModePill,
            job.workMode === 'Remote'
              ? styles.remotePill
              : job.workMode === 'Hybrid'
              ? styles.hybridPill
              : styles.onsitePill,
          ]}
        >
          <Text
            style={[
              styles.workModeText,
              job.workMode === 'Remote'
                ? { color: '#0284C7' }
                : job.workMode === 'Hybrid'
                ? { color: '#7C3AED' }
                : { color: '#D97706' },
            ]}
          >
            {job.workMode || 'On-site'}
          </Text>
        </View>

        {/* Internship PPO Badge */}
        {isInternship && job.ppoAvailable && (
          <View style={styles.ppoPill}>
            <Icons.Zap color="#059669" size={10} />
            <Text style={styles.ppoText}>PPO Available</Text>
          </View>
        )}
      </View>

      {/* Skills Chips */}
      {Array.isArray(job.skills) && job.skills.length > 0 && (
        <View style={styles.skillsRow}>
          {job.skills.slice(0, 4).map((skill, idx) => (
            <View key={idx} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{skill}</Text>
            </View>
          ))}
          {job.skills.length > 4 && (
            <Text style={styles.moreSkillsText}>+{job.skills.length - 4} more</Text>
          )}
        </View>
      )}

      {/* Card Footer: Posted Date + Apply Action */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Icons.Clock color="#94A3B8" size={12} />
          <Text style={styles.postedDateText}>
            Posted {job.postedDate || '2d ago'}
            {job.deadline ? ` • Deadline: ${job.deadline}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, hasApplied && styles.appliedBtn]}
          activeOpacity={0.85}
          onPress={handleApplyPress}
        >
          <Text style={[styles.applyBtnText, hasApplied && styles.appliedBtnText]}>
            {hasApplied
              ? '✓ Applied'
              : isInternship
              ? 'Apply Internship'
              : 'Apply Now'}
          </Text>
          {!hasApplied && <Icons.ArrowRight color="#0F172A" size={12} style={{ marginLeft: 4 }} />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 0,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  internBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  internBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#EC4899',
    letterSpacing: 0.5,
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  companyNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  jobIdBadge: {
    marginLeft: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobIdBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  saveBtn: {
    padding: 4,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  workModePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  remotePill: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  hybridPill: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  onsitePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  workModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ppoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ppoText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  skillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  moreSkillsText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postedDateText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5B800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  appliedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  appliedBtnText: {
    color: '#059669',
  },
});

const JobCard = memo(JobCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.job.id === nextProps.job.id &&
    prevProps.job.title === nextProps.job.title &&
    prevProps.job.salary === nextProps.job.salary &&
    prevProps.job.company === nextProps.job.company
  );
});

export default JobCard;
