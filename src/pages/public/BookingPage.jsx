import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicDoctors, getAvailableSlots, submitPublicBooking, statusOf } from '../../services/publicBookingService';
import '../../styles/patient-public.css';

const today = () => { const d = new Date(); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); };
const initial = { firstName:'', lastName:'', phone:'', dateOfBirth:'', doctorId:'', appointmentDate:'', slot:'', reason:'' };
const validName = value => /^[\p{L}\p{M} .'-]+$/u.test(value.trim());
const validPhone = value => /^(?:\+94|0)7[0-9]{8}$/.test(value.replace(/[\s-]/g,''));
const validateBooking = (form, t) => {
  const errors = {};
  for (const key of ['firstName','lastName']) if (!form[key].trim()) errors[key] = t('booking.required'); else if (!validName(form[key])) errors[key] = t('booking.invalidName');
  if (!validPhone(form.phone)) errors.phone = t('booking.invalidPhone');
  if (!form.dateOfBirth || form.dateOfBirth > today()) errors.dateOfBirth = t('booking.invalidDob');
  if (!form.doctorId) errors.doctorId = t('booking.required');
  if (!form.appointmentDate || form.appointmentDate < today()) errors.appointmentDate = t('booking.invalidDate');
  if (!form.slot) errors.slot = t('booking.required');
  return errors;
};
export default function BookingPage() {
  const {t} = useTranslation(); const navigate = useNavigate(); const location = useLocation();
  const [form,setForm] = useState(initial); const [doctors,setDoctors] = useState([]); const [slots,setSlots] = useState([]);
  const [errors,setErrors] = useState({}); const [message,setMessage] = useState(location.state?.missingConfirmation ? 'booking.checkMessage' : '');
  const [pending,setPending] = useState(false); const [loadingSlots,setLoadingSlots] = useState(false); const [retrySlots,setRetrySlots] = useState(0);
  useEffect(() => { const c = new AbortController(); getPublicDoctors(c.signal).then(ds => {setDoctors(ds);if(ds.length === 1) setForm(f => ({...f,doctorId:ds[0].id}));}).catch(() => setMessage('booking.doctorError')); return () => c.abort(); },[]);
  useEffect(() => { if (!form.doctorId || !form.appointmentDate) return; const c = new AbortController(); getAvailableSlots(form.doctorId,form.appointmentDate,c.signal).then(setSlots).catch(() => {if(!c.signal.aborted) setMessage('booking.slotError');}).finally(() => {if(!c.signal.aborted) setLoadingSlots(false);});return () => c.abort(); },[form.doctorId,form.appointmentDate,retrySlots]);
  const change = e => {const {name,value} = e.target;if (['doctorId','appointmentDate'].includes(name)) {setSlots([]);setLoadingSlots(Boolean(value && (name === 'doctorId' ? form.appointmentDate : form.doctorId)));}setForm(f => ({...f,[name]:value,...(['doctorId','appointmentDate'].includes(name)?{slot:''}:{})}));setErrors(x => ({...x,[name]:undefined}));setMessage('');};
  const reloadSlots = () => {setSlots([]);setLoadingSlots(true);setRetrySlots(x=>x+1);};
  const submit = async e => {e.preventDefault();const found=validateBooking(form,t);setErrors(found);if(Object.keys(found).length) return;setPending(true);setMessage('');try {
    const result = await submitPublicBooking({firstName:form.firstName.trim(),lastName:form.lastName.trim(),phone:form.phone.replace(/[\s-]/g,''),dateOfBirth:form.dateOfBirth,doctorId:form.doctorId,date:form.appointmentDate,time:form.slot,reason:form.reason.trim()});
    navigate('/appointments/confirmed',{state:{booking:{doctor:doctors.find(d => d.id === form.doctorId)?.name || '',date:form.appointmentDate,time:form.slot,status:'Scheduled',reference:result.appointmentId ?? result.id ?? null}}});
  }catch(err){const status=statusOf(err);if(status===409){setMessage('booking.conflict');setForm(f=>({...f,slot:''}));reloadSlots();}else if(status===429)setMessage('booking.rateLimit');else setMessage('booking.submitError');}finally{setPending(false);}};
  const field=(key,type='text',required=true) => <div className="patient-field" key={key}><label htmlFor={key}>{t(`booking.${key}`)}</label><input id={key} name={key} type={type} value={form[key]} onChange={change} required={required} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?`${key}-error`:undefined} max={key==='dateOfBirth'?today():undefined} min={key==='appointmentDate'?today():undefined}/>{errors[key]&&<small id={`${key}-error`} role="alert">{errors[key]}</small>}</div>;
  return <main className="patient-shell"><h1>{t('booking.title')}</h1>{message && <p role="alert" className="patient-alert">{t(message)}</p>}<form className="patient-form" onSubmit={submit} noValidate>
    {field('firstName')}{field('lastName')}{field('phone','tel')}{field('dateOfBirth','date')}
    <div className="patient-field"><label htmlFor="doctorId">{t('booking.doctorId')}</label><select id="doctorId" name="doctorId" value={form.doctorId} onChange={change}><option value="">{t('booking.chooseDoctor')}</option>{doctors.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select>{errors.doctorId&&<small role="alert">{errors.doctorId}</small>}</div>
    {field('appointmentDate','date')}
    <div className="patient-field"><label htmlFor="slot">{t('booking.slot')}</label><select id="slot" name="slot" value={form.slot} onChange={change} disabled={loadingSlots||!slots.length}><option value="">{t('booking.chooseSlot')}</option>{slots.map(s=><option key={s} value={s}>{s}</option>)}</select>{errors.slot&&<small role="alert">{errors.slot}</small>}{loadingSlots&&<p role="status">{t('common.loading')}</p>}{!loadingSlots&&form.doctorId&&form.appointmentDate&&!slots.length&&<p>{t('booking.noSlots')}</p>}{message==='booking.slotError'&&<button type="button" onClick={()=>reloadSlots()}>{t('booking.retry')}</button>}</div>
    <div className="patient-field patient-full"><label htmlFor="reason">{t('booking.reason')}</label><textarea id="reason" name="reason" maxLength={500} value={form.reason} onChange={change}/></div>
    <button className="patient-button patient-full" disabled={pending} type="submit">{pending?t('booking.submitting'):t('booking.submit')}</button>
  </form></main>;
}
