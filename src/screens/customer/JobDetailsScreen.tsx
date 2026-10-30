import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Linking,
  StatusBar,
  NativeModules,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { JobItem } from '../../components/JobCard';
import { useWishlistStore } from '../../store/wishlistStore';
import { useToastStore } from '../../store/toastStore';
import { useOrderStore, Order } from '../../store/orderStore';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { apiFetch } from '../../services/api';
import { useNotificationStore } from '../../store/notificationStore';
import { dispatchCustomerNotification } from '../../services/notificationService';

const { width, height } = Dimensions.get('window');

export default function JobDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const isLight =
    colors.background === '#FFFDF5' ||
    colors.background === '#FFFFFF' ||
    colors.background === '#F8FAFC' ||
    colors.background === '#FFF8E8' ||
    themeMode === 'light';

  const rawJob: JobItem | null = route.params?.job || null;

  if (!rawJob) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Icons.ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Job Details</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Icons.Briefcase color={colors.subtext} size={56} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            Job Not Found
          </Text>
          <Text style={{ fontSize: 14, color: colors.subtext, textAlign: 'center', marginBottom: 20 }}>
            This job listing is unavailable or has been removed.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}
          >
            <Text style={{ color: '#000', fontWeight: 'bold' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useAuthStore((state) => state.currentUser);

  const isSaved = wishlistItems.some((i) => i.id === rawJob.id);
  const isInternship =
    rawJob.itemType === 'INTERNSHIP' ||
    (rawJob.employmentType || '').toLowerCase().includes('intern');

  const jobID = rawJob.jobID || (rawJob.id ? `JOB-${String(rawJob.id).replace(/[^\d]/g, '').slice(-5) || '10482'}` : 'JOB-10482');

  // Application Sheet State
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(
    Boolean(route.params?.openApplySheet)
  );
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false);
  const [applicantResume, setApplicantResume] = useState('');
  const [isDocModalVisible, setIsDocModalVisible] = useState(false);
  const [manualDocName, setManualDocName] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEducation, setApplicantEducation] = useState('');
  const [applicantExperience, setApplicantExperience] = useState('');
  const [applicationDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  const resetApplicantForm = useCallback(() => {
    setApplicantResume('');
    setManualDocName('');
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setApplicantEducation('');
    setApplicantExperience('');
  }, []);

  useEffect(() => {
    resetApplicantForm();
    setHasSubmittedApplication(false);
  }, [jobID, resetApplicantForm]);

  const pickDeviceDocument = async () => {
    try {
      if (NativeModules.NativeDocumentPicker && typeof NativeModules.NativeDocumentPicker.pickDocument === 'function') {
        const doc = await NativeModules.NativeDocumentPicker.pickDocument();
        if (doc && (doc.name || doc.fileName)) {
          const chosenName = doc.name || doc.fileName;
          setApplicantResume(chosenName);
          showToast('Document attached: ' + chosenName);
          setIsDocModalVisible(false);
          return;
        }
      } else {
        setIsDocModalVisible(true);
      }
    } catch (err: any) {
      if (err?.code === 'CANCELLED' || err?.message?.includes('cancelled') || err?.message?.includes('CANCELLED')) {
        return;
      }
      console.log('Document picker error:', err);
      setIsDocModalVisible(true);
    }
  };

  const handleSelectResume = () => {
    pickDeviceDocument();
  };

  const handleSaveToggle = () => {
    toggleWishlist({
      id: rawJob.id,
      name: rawJob.title,
      price: rawJob.salary,
      category: 'Jobs',
      image: rawJob.logo,
    });
    if (!isSaved) {
      showToast('Job saved to your bookmarks', 'View Saved', () =>
        navigation.navigate('Wishlist')
      );
    }
  };

  const handleSubmitApplication = async () => {
    if (!applicantName.trim()) {
      showToast('Please enter your full name');
      return;
    }
    if (!applicantEmail.trim()) {
      showToast('Please enter your email address');
      return;
    }
    if (!applicantPhone.trim()) {
      showToast('Please enter your contact number');
      return;
    }

    const genAppId = `JOB-${Math.random().toString(16).substring(2, 8)}`;
    const authCustId = currentUser?.customerId || currentUser?.registrationId || currentUser?.id || 'guest_user';
    const applicationOrder: Order = {
      id: `ord_job_${Date.now()}`,
      user_id: currentUser?.id || 'guest_user',
      customer_id: authCustId,
      customerId: authCustId,
      type: 'Jobs',
      order_number: genAppId,
      application_id: genAppId,
      job_id: jobID,
      vendor_id: (rawJob as any).vendorId || (rawJob as any).vendor_id || '',
      vendorId: (rawJob as any).vendorId || (rawJob as any).vendor_id || '',
      productId: jobID,
      vendor_name: rawJob.company || 'Verified Employer',
      category: 'Jobs',
      order_type: 'booking',
      customer_name: applicantName.trim(),
      customer_phone: applicantPhone.trim(),
      customer_address: `${applicantEducation} • ${applicantExperience} • Resume: ${applicantResume}`,
      customer_latitude: 12.9716,
      customer_longitude: 77.5946,
      product_details: rawJob.title || 'Job Role',
      amount: 0,
      finalAmount: 0,
      status: 'Application Submitted',
      application_status: 'Applied',
      created_at: new Date().toISOString(),
      image: '',
      brand_or_seller: rawJob.companyName || rawJob.company,
      salary: rawJob.salary || (rawJob as any).salaryPackage || '',
      location: rawJob.location || (rawJob as any).jobLocation || '',
      department: rawJob.department || (rawJob as any).subCategory || (rawJob as any).subcategory || 'General',
      work_mode: rawJob.workMode || (rawJob as any).jobType || (rawJob as any).employmentType || 'Full-time',
      experience: rawJob.experience || (rawJob as any).experienceLevel || (rawJob as any).experienceRequired || '',
      resume_name: applicantResume,
      applicant_education: applicantEducation,
      applicant_experience: applicantExperience,
      applicant_email: applicantEmail.trim(),
      candidateName: applicantName.trim(),
      candidatePhone: applicantPhone.trim(),
      candidateEmail: applicantEmail.trim(),
      candidateEducation: applicantEducation,
      candidateExperience: applicantExperience,
      candidateResume: applicantResume,
      items: [
        {
          name: `${rawJob.title}`,
          quantity: 1,
          price: 0,
          variant: `${applicantEducation} | ${applicantExperience}`,
        },
      ],
    };

    useOrderStore.getState().addLocalOrder(applicationOrder);

    // Notification Center & System Notification Dispatch
    dispatchCustomerNotification({
      title: 'Application Submitted! 💼',
      body: `Your job application #${genAppId} for ${rawJob.title} at ${rawJob.company || 'Employer'} has been sent successfully.`,
      icon: 'Briefcase',
      category: 'order',
      actionLabel: 'View Job',
      actionType: 'job',
      orderType: 'job',
      orderId: genAppId,
      targetScreen: 'Orders',
      targetParams: { category: 'Jobs', activeTab: 'job applied', orderId: genAppId },
    });

    // Asynchronously sync to backend order database
    apiFetch('/orders', {
      method: 'POST',
      body: applicationOrder,
    }).catch((err) => console.log('Job order sync notice:', err));

    resetApplicantForm();
    setHasSubmittedApplication(true);
    setIsApplyModalVisible(false);

    showToast(
      `Application submitted for ${jobID} to ${rawJob.company}!`,
      'Track My Jobs',
      () =>
        navigation.navigate('CustomerTabs', {
          screen: 'Orders',
          params: { category: 'Jobs', activeTab: 'Job Applied' },
        })
    );
  };

  const skills = Array.isArray(rawJob.skills) ? rawJob.skills : ['React Native', 'TypeScript', 'Node.js'];
  const companyInfo = rawJob.companyInfo || {};
  const companyName = rawJob.companyName || rawJob.company || 'Verified Employer';
  const companyWebsite = rawJob.companyWebsite || companyInfo.website || (rawJob as any).linkedProfileUrl || '';

  const rawResponsibilities =
    rawJob.keyResponsibilities ||
    (rawJob as any).responsibilities ||
    (rawJob as any).rawProduct?.keyResponsibilities;

  const responsibilitiesList: string[] = useMemo(() => {
    if (Array.isArray(rawResponsibilities)) {
      return rawResponsibilities.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof rawResponsibilities === 'string' && rawResponsibilities.trim()) {
      const lines = rawResponsibilities
        .split(/\r?\n|;/)
        .map((line) => line.replace(/^[\s•\-\*]+/, '').trim())
        .filter((line) => line.length > 0);
      if (lines.length > 0) return lines;
      return [rawResponsibilities.trim()];
    }
    return [
      'Take ownership of assigned project modules and deliver high-quality work.',
      'Collaborate closely with team members, designers, and managers to achieve milestones.',
      'Ensure timely deliverables while maintaining industry standards and best practices.',
    ];
  }, [rawResponsibilities]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.background}
        translucent={false}
      />
      {/* Top Header Bar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isLight ? '#FFF1C7' : colors.background,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {isInternship ? 'Internship Details' : 'Job Details'}
        </Text>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSaveToggle}>
            <Icons.Bookmark
              color={isSaved ? '#F5B800' : colors.text}
              fill={isSaved ? '#F5B800' : 'transparent'}
              size={19}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* 1. JOB OVERVIEW CARD                                                      */}
        {/* ========================================================================= */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.companyRow}>
            <View style={{ flex: 1, marginLeft: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.jobTitleText, { color: colors.text }]} numberOfLines={2}>
                  {rawJob.title || 'Job Opening'}
                </Text>
              </View>
              <View style={styles.companyMeta}>
                <Text style={[styles.companyName, { color: colors.primary }]}>
                  {companyName}
                </Text>
                {rawJob.isVerified !== false && (
                  <Icons.CheckCircle2 color="#0EA5E9" size={13} style={{ marginLeft: 4 }} />
                )}
                <View style={styles.jobIdBadge}>
                  <Text style={styles.jobIdBadgeText}>{jobID}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Highlights Grid (Work Mode Removed) */}
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Icons.Briefcase color="#0EA5E9" size={14} />
              <View>
                <Text style={styles.overviewLabel}>
                  {isInternship ? 'DURATION' : 'EXPERIENCE'}
                </Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>
                  {isInternship ? rawJob.duration || 'Not specified' : rawJob.experience || 'Not specified'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewItem}>
              <Icons.IndianRupee color="#059669" size={14} />
              <View>
                <Text style={styles.overviewLabel}>
                  {isInternship ? 'STIPEND' : 'SALARY'}
                </Text>
                <Text style={[styles.overviewValue, { color: '#059669', fontWeight: '800' }]}>
                  {rawJob.salary || 'Competitive'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewItem}>
              <Icons.MapPin color="#EC4899" size={14} />
              <View>
                <Text style={styles.overviewLabel}>LOCATION</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>
                  {rawJob.location || 'Flexible'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewItem}>
              <Icons.Layers color="#F59E0B" size={14} />
              <View>
                <Text style={styles.overviewLabel}>TYPE</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>
                  {rawJob.employmentType || 'Full-time'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewItem}>
              <Icons.Users color="#10B981" size={14} />
              <View>
                <Text style={styles.overviewLabel}>OPENINGS</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>
                  {rawJob.openings || 3} Positions
                </Text>
              </View>
            </View>
          </View>

          {/* Key Skills Chips */}
          <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 12 }]}>
            REQUIRED SKILLS
          </Text>
          <View style={styles.skillsContainer}>
            {skills.map((skill, idx) => (
              <View key={idx} style={styles.skillBadge}>
                <Text style={styles.skillBadgeText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 2. JOB DESCRIPTION & RESPONSIBILITIES                                    */}
        {/* ========================================================================= */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Job Description</Text>

          <Text style={[styles.descriptionText, { color: isLight ? '#475569' : 'rgba(255,255,255,0.75)' }]}>
            {rawJob.description}
          </Text>

          {responsibilitiesList.length > 0 && (
            <>
              <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 14 }]}>
                KEY RESPONSIBILITIES
              </Text>
              <View style={styles.bulletList}>
                {responsibilitiesList.map((resp, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text
                      style={[
                        styles.bulletText,
                        { color: isLight ? '#475569' : 'rgba(255,255,255,0.75)' },
                      ]}
                    >
                      {resp}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ========================================================================= */}
        {/* 3. ABOUT COMPANY SECTION                                                  */}
        {/* ========================================================================= */}
        {/* 3. ABOUT COMPANY SECTION (Company Name and Website Only)                  */}
        {/* ========================================================================= */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Company Details</Text>

          <View style={styles.companyProfileRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.companyProfileName, { color: colors.text, fontSize: 16 }]}>
                {companyName}
              </Text>
              {companyWebsite ? (
                <Text style={[styles.companyProfileMeta, { color: '#0EA5E9', marginTop: 4 }]} numberOfLines={1}>
                  {companyWebsite}
                </Text>
              ) : null}
            </View>
            {companyWebsite ? (
              <TouchableOpacity
                style={styles.websiteBtn}
                onPress={() => {
                  const url = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Icons.Globe color="#0EA5E9" size={14} />
                <Text style={styles.websiteBtnText}>Website</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: isLight ? '#FFFFFF' : colors.background,
            borderTopColor: isLight ? '#F1EAD8' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.saveActionBtn}
          onPress={handleSaveToggle}
          activeOpacity={0.8}
        >
          <Icons.Bookmark
            color={isSaved ? '#F5B800' : colors.text}
            fill={isSaved ? '#F5B800' : 'transparent'}
            size={18}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryApplyBtn, hasSubmittedApplication && styles.submittedBtn]}
          activeOpacity={0.85}
          onPress={() => {
            if (hasSubmittedApplication) {
              showToast('Application already submitted', 'Track Application', () =>
                navigation.navigate('CustomerTabs', {
                  screen: 'Orders',
                  params: { category: 'Jobs' },
                })
              );
            } else {
              const authUser = useAuthStore.getState().currentUser;
              if (!isUserAuthenticated(authUser)) {
                useAuthStore.getState().setPendingPurchaseProduct({
                  ...rawJob,
                  actionType: 'apply_job',
                  returnScreen: 'JobDetails',
                });
                useAuthGuardStore.getState().showAuthModal('apply for this position and track your application');
                return;
              }
              resetApplicantForm();
              setIsApplyModalVisible(true);
            }
          }}
        >
          <Text style={[styles.primaryApplyBtnText, hasSubmittedApplication && styles.submittedBtnText]}>
            {hasSubmittedApplication
              ? '✓ Application Submitted'
              : isInternship
              ? 'Apply for Internship'
              : 'Apply Now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* JOB APPLICATION BOTTOM SHEET                                             */}
      {/* ========================================================================= */}
      <Modal
        visible={isApplyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          resetApplicantForm();
          setIsApplyModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
                maxHeight: height * 0.85,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  {isInternship ? 'Internship Application' : 'Job Application'}
                </Text>
                <Text style={[styles.modalHeaderSubtitle, { color: colors.subtext }]}>
                  Applying to {rawJob.company}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                resetApplicantForm();
                setIsApplyModalVisible(false);
              }}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 18 }} showsVerticalScrollIndicator={false}>
              {/* 1. SELECT RESUME / RESUME UPLOAD */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>1. SELECT RESUME</Text>
              <View style={[styles.resumeCard, { backgroundColor: isLight ? '#FFFDF5' : colors.cardBgSecondary, borderColor: isLight ? '#FDE68A' : colors.border }]}>
                <Icons.FileText color="#F5B800" size={22} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.resumeName, { color: colors.text }]} numberOfLines={1}>
                    {applicantResume || 'Attach Resume (PDF/DOC)'}
                  </Text>
                  <Text style={[styles.resumeMeta, { color: colors.subtext }]}>
                    {applicantResume ? 'PDF / Document • Ready for submission' : 'Tap to upload or select document'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleSelectResume} style={styles.changeBtn} activeOpacity={0.7}>
                  <Text style={styles.changeBtnText}>{applicantResume ? 'Change' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>

              {/* 2. JOB ID */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                2. JOB ID (DEFAULT)
              </Text>
              <View style={[styles.readOnlyField, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                <Icons.Briefcase color="#0EA5E9" size={16} />
                <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>{jobID}</Text>
                <View style={[styles.autoBadge, { backgroundColor: 'rgba(14, 165, 233, 0.12)' }]}>
                  <Text style={[styles.autoBadgeText, { color: '#0284C7' }]}>Auto</Text>
                </View>
              </View>

              {/* 3. FULL NAME */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                3. FULL NAME *
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={applicantName}
                onChangeText={setApplicantName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.subtext}
              />

              {/* 4. EMAIL ADDRESS */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                4. EMAIL ADDRESS *
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={applicantEmail}
                onChangeText={setApplicantEmail}
                placeholder="Enter your email address"
                placeholderTextColor={colors.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* 5. CONTACT NUMBER */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                5. CONTACT NUMBER *
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={applicantPhone}
                onChangeText={setApplicantPhone}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor={colors.subtext}
                keyboardType="phone-pad"
              />

              {/* 6. GRADUATION */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                6. GRADUATION / HIGHEST EDUCATION
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={applicantEducation}
                onChangeText={setApplicantEducation}
                placeholder="e.g. B.Tech in Computer Science / MCA / Degree"
                placeholderTextColor={colors.subtext}
              />

              {/* 7. EXPERIENCE */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                7. EXPERIENCE
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={applicantExperience}
                onChangeText={setApplicantExperience}
                placeholder="e.g. 2 Years / Fresher"
                placeholderTextColor={colors.subtext}
              />

              {/* 8. APPLICATION DATE */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                8. APPLICATION DATE
              </Text>
              <View style={[styles.readOnlyField, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                <Icons.Calendar color="#F59E0B" size={16} />
                <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>{applicationDate}</Text>
                <View style={[styles.autoBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Text style={[styles.autoBadgeText, { color: '#D97706' }]}>Today</Text>
                </View>
              </View>

              {/* Submit Action */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={handleSubmitApplication}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {isInternship ? 'Submit Internship Application' : 'Submit Job Application'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DOCUMENT PICKER / RESUME SELECTION MODAL */}
      <Modal
        visible={isDocModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsDocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
                maxHeight: height * 0.78,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  Select Resume / Document
                </Text>
                <Text style={[styles.modalHeaderSubtitle, { color: colors.subtext }]}>
                  Attach a PDF or document from your device
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsDocModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 18 }} showsVerticalScrollIndicator={false}>
              {/* Primary Action: Browse Device Documents */}
              <TouchableOpacity
                onPress={pickDeviceDocument}
                activeOpacity={0.8}
                style={[
                  styles.docOptionCard,
                  {
                    backgroundColor: isLight ? '#FEF3C7' : '#1E293B',
                    borderColor: '#F5B800',
                  },
                ]}
              >
                <View style={[styles.docIconBox, { backgroundColor: '#F5B800' }]}>
                  <Icons.FolderOpen color="#0F172A" size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.docOptionTitle, { color: colors.text }]}>
                    Browse Device Documents
                  </Text>
                  <Text style={[styles.docOptionSub, { color: colors.subtext }]}>
                    Open Android Files / Downloads (PDF, DOCX, TXT)
                  </Text>
                </View>
                <Icons.ChevronRight color="#F5B800" size={18} />
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 18, marginBottom: 8 }]}>
                RECENT / SAVED RESUMES
              </Text>

              {[
                {
                  name: currentUser?.name
                    ? `${currentUser.name.replace(/\s+/g, '_')}_Resume_2026.pdf`
                    : 'Uma_Resume_2026.pdf',
                  size: '1.4 MB • PDF / Document',
                },
                {
                  name: currentUser?.name
                    ? `${currentUser.name.replace(/\s+/g, '_')}_FullStack_CV.pdf`
                    : 'Uma_FullStack_CV.pdf',
                  size: '920 KB • PDF / Document',
                },
                {
                  name: currentUser?.name
                    ? `${currentUser.name.replace(/\s+/g, '_')}_Technical_Portfolio.docx`
                    : 'Uma_Technical_Portfolio.docx',
                  size: '2.1 MB • Word Document',
                },
              ].map((doc, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setApplicantResume(doc.name);
                    showToast('Selected: ' + doc.name);
                    setIsDocModalVisible(false);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.recentDocRow,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : colors.cardBgSecondary,
                      borderColor: applicantResume === doc.name ? '#F5B800' : isLight ? '#F1EAD8' : colors.border,
                      borderWidth: applicantResume === doc.name ? 1.5 : 1,
                    },
                  ]}
                >
                  <Icons.FileText color="#F5B800" size={18} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.recentDocName, { color: colors.text }]} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={[styles.recentDocMeta, { color: colors.subtext }]}>
                      {doc.size}
                    </Text>
                  </View>
                  {applicantResume === doc.name && (
                    <Icons.CheckCircle2 color="#10B981" size={18} />
                  )}
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 18, marginBottom: 8 }]}>
                OR ENTER CUSTOM DOCUMENT NAME
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 20 }}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      flex: 1,
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  placeholder="e.g. My_Updated_Resume.pdf"
                  placeholderTextColor={colors.subtext}
                  value={manualDocName}
                  onChangeText={setManualDocName}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (manualDocName.trim()) {
                      const finalName =
                        manualDocName.trim().endsWith('.pdf') ||
                        manualDocName.trim().endsWith('.docx') ||
                        manualDocName.trim().endsWith('.doc')
                          ? manualDocName.trim()
                          : `${manualDocName.trim()}.pdf`;
                      setApplicantResume(finalName);
                      showToast('Attached: ' + finalName);
                      setManualDocName('');
                      setIsDocModalVisible(false);
                    }
                  }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#F5B800',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>Attach</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  companyLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  jobTitleText: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  companyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '700',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  overviewItem: {
    width: (width - 70) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  overviewValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F5B800',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  companyProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyProfileLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  companyProfileName: {
    fontSize: 14,
    fontWeight: '800',
  },
  companyProfileMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  websiteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  companyInfoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoCol: {
    alignItems: 'center',
  },
  infoColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  infoColVal: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  saveActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryApplyBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#F5B800',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryApplyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  submittedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  submittedBtnText: {
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 12,
  },
  resumeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  resumeMeta: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(245, 184, 0, 0.15)',
    borderRadius: 8,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  jobIdBadge: {
    marginLeft: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobIdBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  readOnlyFieldText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  autoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalSubmitBtn: {
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  docOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docOptionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  docOptionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  recentDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recentDocName: {
    fontSize: 13,
    fontWeight: '700',
  },
  recentDocMeta: {
    fontSize: 11,
    marginTop: 2,
  },
});
