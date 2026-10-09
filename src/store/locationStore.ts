import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StateCityData {
  state: string;
  isUT?: boolean;
  cities: string[];
}

export const INDIAN_STATES_AND_CITIES: StateCityData[] = [
  {
    state: 'Karnataka',
    cities: ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Davangere', 'Ballari', 'Kalaburagi', 'Shivamogga', 'Tumakuru', 'Udupi', 'Hassan'],
  },
  {
    state: 'Maharashtra',
    cities: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Amravati'],
  },
  {
    state: 'Delhi (NCT)',
    isUT: true,
    cities: ['New Delhi', 'Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Rohini', 'Connaught Place'],
  },
  {
    state: 'Tamil Nadu',
    cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul'],
  },
  {
    state: 'Telangana',
    cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Secunderabad', 'Ramagundam', 'Mahbubnagar'],
  },
  {
    state: 'Kerala',
    cities: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram'],
  },
  {
    state: 'Andhra Pradesh',
    cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Anantapur', 'Eluru'],
  },
  {
    state: 'Gujarat',
    cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari'],
  },
  {
    state: 'West Bengal',
    cities: ['Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Kharagpur', 'Malda', 'Darjeeling'],
  },
  {
    state: 'Rajasthan',
    cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar', 'Jaisalmer'],
  },
  {
    state: 'Uttar Pradesh',
    cities: ['Lucknow', 'Kanpur', 'Noida', 'Greater Noida', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad', 'Meerut', 'Bareilly', 'Gorakhpur', 'Mathura'],
  },
  {
    state: 'Punjab',
    cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Pathankot'],
  },
  {
    state: 'Haryana',
    cities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
  },
  {
    state: 'Madhya Pradesh',
    cities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  },
  {
    state: 'Bihar',
    cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai'],
  },
  {
    state: 'Odisha',
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak'],
  },
  {
    state: 'Goa',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Calangute'],
  },
  {
    state: 'Assam',
    cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  },
  {
    state: 'Jammu & Kashmir',
    isUT: true,
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur'],
  },
  {
    state: 'Chandigarh',
    isUT: true,
    cities: ['Chandigarh', 'Sector 17', 'Sector 35', 'Manimajra'],
  },
  {
    state: 'Uttarakhand',
    cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Nainital', 'Rudrapur'],
  },
  {
    state: 'Himachal Pradesh',
    cities: ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Manali', 'Una'],
  },
  {
    state: 'Jharkhand',
    cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  },
  {
    state: 'Chhattisgarh',
    cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  },
  {
    state: 'Puducherry',
    isUT: true,
    cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  },
  {
    state: 'Ladakh',
    isUT: true,
    cities: ['Leh', 'Kargil'],
  },
  {
    state: 'Tripura',
    cities: ['Agartala', 'Udaipur', 'Dharmanagar'],
  },
  {
    state: 'Meghalaya',
    cities: ['Shillong', 'Tura', 'Jowai'],
  },
  {
    state: 'Manipur',
    cities: ['Imphal', 'Churachandpur', 'Thoubal'],
  },
  {
    state: 'Nagaland',
    cities: ['Kohima', 'Dimapur', 'Mokokchung'],
  },
  {
    state: 'Arunachal Pradesh',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat'],
  },
  {
    state: 'Mizoram',
    cities: ['Aizawl', 'Lunglei', 'Champhai'],
  },
  {
    state: 'Sikkim',
    cities: ['Gangtok', 'Namchi', 'Gyalshing'],
  },
  {
    state: 'Andaman & Nicobar Islands',
    isUT: true,
    cities: ['Port Blair', 'Havelock Island', 'Neil Island'],
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    isUT: true,
    cities: ['Daman', 'Diu', 'Silvassa'],
  },
  {
    state: 'Lakshadweep',
    isUT: true,
    cities: ['Kavaratti', 'Agatti', 'Andrott'],
  },
];

interface LocationState {
  selectedState: string;
  selectedCity: string;
  isCurrentLocation: boolean;
  setLocation: (state: string, city?: string, isCurrent?: boolean) => void;
  getDisplayLocation: () => string;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      selectedState: 'Karnataka',
      selectedCity: 'Bengaluru',
      isCurrentLocation: true,

      setLocation: (state: string, city = '', isCurrent = false) => {
        set({
          selectedState: state,
          selectedCity: city,
          isCurrentLocation: isCurrent,
        });
      },

      getDisplayLocation: () => {
        const { selectedState, selectedCity } = get();
        if (selectedCity && selectedState) {
          return `${selectedCity}, ${selectedState}`;
        }
        return selectedState || 'Karnataka';
      },
    }),
    {
      name: 'connect_app_location_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
