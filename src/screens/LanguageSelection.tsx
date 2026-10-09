import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import GlassCard from '../components/GlassCard';
import * as Icons from 'lucide-react-native';
import { useLanguageStore, LANGUAGES_LIST } from '../store/languageStore';

const { height } = Dimensions.get('window');

export default function LanguageSelection() {
  const navigation = useNavigation<any>();
  const currentLanguage = useLanguageStore((state) => state.currentLanguage);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const t = useLanguageStore((state) => state.t);

  const handleSelectLanguage = (name: string) => {
    setLanguage(name);
    setTimeout(() => {
      navigation.navigate('Permissions');
    }, 300);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icons.ChevronLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('select_language')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBox}>
          <Text style={styles.title}>{t('select_language')}</Text>
          <Text style={styles.subtitle}>{t('choose_language_desc')}</Text>
        </View>

        {/* List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>SUPPORTED LANGUAGES</Text>
          {LANGUAGES_LIST.map((lang) => {
            const isSelected = currentLanguage === lang.name;
            return (
              <TouchableOpacity key={lang.code} activeOpacity={0.9} onPress={() => handleSelectLanguage(lang.name)}>
                <GlassCard
                  style={styles.langCard}
                  borderColor={isSelected ? 'rgba(244, 196, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
                >
                  <View style={styles.langLeft}>
                    <View style={[styles.flagCircle, isSelected && styles.flagCircleActive]}>
                      <Icons.Globe color={isSelected ? '#F4C400' : '#94A3B8'} size={18} />
                    </View>
                    <View style={styles.langNames}>
                      <Text style={[styles.langName, isSelected && styles.langNameActive]}>
                        {lang.name} {lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B1E',
  },
  header: {
    height: 60,
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introBox: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  listContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F4C400',
    letterSpacing: 1,
    marginBottom: 8,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagCircleActive: {
    backgroundColor: 'rgba(244, 196, 0, 0.15)',
  },
  langNames: {
    justifyContent: 'center',
  },
  langName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  langNameActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#F4C400',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F4C400',
  },
});
