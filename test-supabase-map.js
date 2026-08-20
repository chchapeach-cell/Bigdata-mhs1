import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frpjtkltipmwpevngdrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data: suSchools, error: suErr } = await supabase.from('schools').select('*').order('id', { ascending: true });
  console.log('Got schools:', suSchools?.length);
  try {
     const mappedSchools = suSchools.map(s => {
              const autoInfo = { amphoe: 'test', networkGroup: 'test' }; // stub
              const resolvedAmphoe = (s.amphoe && s.amphoe !== 'NULL' && String(s.amphoe).trim()) ? String(s.amphoe).trim() : autoInfo.amphoe;
              const resolvedNetworkGroup = (s.network_group && s.network_group !== 'NULL' && String(s.network_group).trim()) ? String(s.network_group).trim() : autoInfo.networkGroup;

              return {
                id: s.id,
                name: s.name,
                district: s.district || 'สพป.แม่ฮ่องสอน เขต 1',
                amphoe: resolvedAmphoe,
                networkGroup: resolvedNetworkGroup,
                internetType: s.internet_type || 'fiber',
                electricity: s.electricity !== undefined ? s.electricity : true,
                waterSystem: s.water_system || 'government',
                waterSystemDetail: s.water_system_detail,
                solarKw: s.solar_kw,
                hasSolarBattery: s.has_solar_battery,
                solarBatteryCapacity: s.solar_battery_capacity,
                staffCount: s.staff_count ?? 0,
                contractTeachersCount: s.contract_teachers_count ?? s.contractTeachersCount ?? 0,
                adminStaffCount: s.admin_staff_count ?? s.adminStaffCount ?? 0,
                janitorCount: s.janitor_count ?? s.janitorCount ?? 0,
                otherStaffCount: s.other_staff_count ?? s.otherStaffCount ?? 0,
                majorSubjects: s.major_subjects || [],
                majorSubjectsWithStaff: s.major_subjects_with_staff || [],
                classrooms: s.classrooms || [],
                directorName: s.director_name || s.directorName,
                directorPhone: s.director_phone || s.directorPhone,
                viceDirectorName: s.vice_director_name || s.viceDirectorName,
                viceDirectorPhone: s.vice_director_phone || s.viceDirectorPhone,
                viceDirectors: (s.vice_directors && Array.isArray(s.vice_directors) && s.vice_directors.length > 0)
                  ? s.vice_directors
                  : ((s.viceDirectorName || s.vice_director_name)
                    ? [{ id: 'vd-1', name: s.viceDirectorName || s.vice_director_name || '', phone: s.viceDirectorPhone || s.vice_director_phone || '' }]
                    : []),
                schoolPhone: s.school_phone,
                email: s.email,
                facebook: s.facebook,
                line: s.line,
                website: s.website,
                address: s.address,
                imageUrl: s.image_url,
                logoUrl: s.logo_url,
                directorImageUrl: s.director_image_url,
                latitude: s.latitude,
                longitude: s.longitude,
                size: s.size || 'small',
                isExpansion: s.is_expansion || false,
                specialHighlights: s.special_highlights || ''
              };
            });
     console.log('Mapping success!');
  } catch (e) {
     console.log('Mapping error:', e);
  }
}
test();
