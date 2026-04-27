import { useState, useMemo, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { useTranslation } from '@/contexts/LanguageContext';
import { TableSkeleton, type TableColumnConfig } from '@/components/Admin/skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuLabel,
    TableActionMenuSeparator,
} from '@/components/ui/table-action-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Pencil, Star, ToggleLeft, Globe, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AdminLanguagesPageProps, Language } from '@/types/admin';
import * as Flags from 'country-flag-icons/react/3x2';

// Country data with names
const COUNTRIES: { code: string; name: string }[] = [
    { code: 'AD', name: 'Andorra' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AL', name: 'Albania' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AO', name: 'Angola' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AT', name: 'Austria' },
    { code: 'AU', name: 'Australia' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BB', name: 'Barbados' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BI', name: 'Burundi' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BN', name: 'Brunei' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BR', name: 'Brazil' },
    { code: 'BS', name: 'Bahamas' },
    { code: 'BT', name: 'Bhutan' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BZ', name: 'Belize' },
    { code: 'CA', name: 'Canada' },
    { code: 'CD', name: 'DR Congo' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'CG', name: 'Congo' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'CI', name: 'Ivory Coast' },
    { code: 'CL', name: 'Chile' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'CU', name: 'Cuba' },
    { code: 'CV', name: 'Cape Verde' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DE', name: 'Germany' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DM', name: 'Dominica' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EE', name: 'Estonia' },
    { code: 'EG', name: 'Egypt' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'ES', name: 'Spain' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FJ', name: 'Fiji' },
    { code: 'FR', name: 'France' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'GD', name: 'Grenada' },
    { code: 'GE', name: 'Georgia' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'GR', name: 'Greece' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HR', name: 'Croatia' },
    { code: 'HT', name: 'Haiti' },
    { code: 'HU', name: 'Hungary' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' },
    { code: 'IN', name: 'India' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IR', name: 'Iran' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IT', name: 'Italy' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JO', name: 'Jordan' },
    { code: 'JP', name: 'Japan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'KI', name: 'Kiribati' },
    { code: 'KM', name: 'Comoros' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'LA', name: 'Laos' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LY', name: 'Libya' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MD', name: 'Moldova' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MK', name: 'North Macedonia' },
    { code: 'ML', name: 'Mali' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MT', name: 'Malta' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MV', name: 'Maldives' },
    { code: 'MW', name: 'Malawi' },
    { code: 'MX', name: 'Mexico' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NE', name: 'Niger' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NR', name: 'Nauru' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'OM', name: 'Oman' },
    { code: 'PA', name: 'Panama' },
    { code: 'PE', name: 'Peru' },
    { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PW', name: 'Palau' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' },
    { code: 'RS', name: 'Serbia' },
    { code: 'RU', name: 'Russia' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SB', name: 'Solomon Islands' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SG', name: 'Singapore' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SM', name: 'San Marino' },
    { code: 'SN', name: 'Senegal' },
    { code: 'SO', name: 'Somalia' },
    { code: 'SR', name: 'Suriname' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'ST', name: 'Sao Tome and Principe' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'SY', name: 'Syria' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'TD', name: 'Chad' },
    { code: 'TG', name: 'Togo' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'TL', name: 'Timor-Leste' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TO', name: 'Tonga' },
    { code: 'TR', name: 'Turkey' },
    { code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TV', name: 'Tuvalu' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'UG', name: 'Uganda' },
    { code: 'US', name: 'United States' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VA', name: 'Vatican City' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'VU', name: 'Vanuatu' },
    { code: 'WS', name: 'Samoa' },
    { code: 'YE', name: 'Yemen' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' },
];

type FlagCode = keyof typeof Flags;

function FlagIcon({ code, className }: { code: string; className?: string }) {
    const FlagComponent = Flags[code as FlagCode];
    if (!FlagComponent) {
        return <Globe className={className || 'h-5 w-7'} />;
    }
    return <FlagComponent className={className || 'h-5 w-7 rounded-sm'} />;
}

type FormData = {
    code: string;
    country_code: string;
    name: string;
    is_rtl: boolean;
    is_active: boolean;
};

const initialFormData: FormData = {
    code: '',
    country_code: '',
    name: '',
    is_rtl: false,
    is_active: true,
};

// Skeleton column configuration for Languages table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'avatar-text', width: 'w-48' }, // Language (flag + name)
    { type: 'text', width: 'w-16' },        // Code
    { type: 'text', width: 'w-16' },        // Country
    { type: 'badge', width: 'w-16' },       // Direction
    { type: 'badge', width: 'w-20' },       // Status
    { type: 'actions', width: 'w-12' },     // Actions
];

export default function Index({ auth, languages, availableLocales }: AdminLanguagesPageProps) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [processing, setProcessing] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [countryOpen, setCountryOpen] = useState(false);
    const [localeSearch, setLocaleSearch] = useState('');
    const [localeOpen, setLocaleOpen] = useState(false);

    // Refs for click-outside handling
    const countryDropdownRef = useRef<HTMLDivElement>(null);
    const localeDropdownRef = useRef<HTMLDivElement>(null);

    // Click-outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setCountryOpen(false);
            }
            if (localeDropdownRef.current && !localeDropdownRef.current.contains(event.target as Node)) {
                setLocaleOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get available locales for the select (include current code when editing)
    const selectableLocales = useMemo(() => {
        const existingCodes = languages.map((l) => l.code);
        // When editing, include the current language's code
        const currentCode = selectedLanguage?.code;
        return availableLocales.filter(
            (code) => !existingCodes.includes(code) || code === currentCode
        );
    }, [availableLocales, languages, selectedLanguage]);

    const filteredLocales = useMemo(() => {
        if (!localeSearch) return selectableLocales;
        const search = localeSearch.toLowerCase();
        return selectableLocales.filter((code) => code.toLowerCase().includes(search));
    }, [localeSearch, selectableLocales]);

    const filteredCountries = useMemo(() => {
        if (!countrySearch) return COUNTRIES;
        const search = countrySearch.toLowerCase();
        return COUNTRIES.filter(
            (c) => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search)
        );
    }, [countrySearch]);

    const resetForm = () => {
        setFormData(initialFormData);
        setCountrySearch('');
        setLocaleSearch('');
    };

    const handleCreate = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const handleEdit = (language: Language) => {
        setSelectedLanguage(language);
        setFormData({
            code: language.code,
            country_code: language.country_code,
            name: language.name,
            is_rtl: language.is_rtl,
            is_active: language.is_active,
        });
        setIsEditOpen(true);
    };

    const handleDelete = (language: Language) => {
        setSelectedLanguage(language);
        setIsDeleteOpen(true);
    };

    const handleToggleStatus = (language: Language) => {
        router.post(
            route('admin.languages.toggle-status', language.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Language status updated.'));
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0] as string;
                    toast.error(message || t('Failed to update language status'));
                },
            }
        );
    };

    const handleSetDefault = (language: Language) => {
        router.post(
            route('admin.languages.set-default', language.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Default language updated.'));
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0] as string;
                    toast.error(message || t('Failed to set default language'));
                },
            }
        );
    };

    const submitCreate = () => {
        setProcessing(true);
        router.post(route('admin.languages.store'), { ...formData, native_name: formData.name }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Language created successfully.'));
                setIsCreateOpen(false);
                resetForm();
            },
            onError: (errors) => {
                const message = Object.values(errors)[0] as string;
                toast.error(message || t('Failed to create language'));
            },
            onFinish: () => setProcessing(false),
        });
    };

    const submitEdit = () => {
        if (!selectedLanguage) return;
        setProcessing(true);
        router.put(route('admin.languages.update', selectedLanguage.id), { ...formData, native_name: formData.name }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Language updated successfully.'));
                setIsEditOpen(false);
                setSelectedLanguage(null);
            },
            onError: (errors) => {
                const message = Object.values(errors)[0] as string;
                toast.error(message || t('Failed to update language'));
            },
            onFinish: () => setProcessing(false),
        });
    };

    const submitDelete = () => {
        if (!selectedLanguage) return;
        setProcessing(true);
        router.delete(route('admin.languages.destroy', selectedLanguage.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Language deleted successfully.'));
                setIsDeleteOpen(false);
                setSelectedLanguage(null);
            },
            onError: (errors) => {
                const message = Object.values(errors)[0] as string;
                toast.error(message || t('Failed to delete language'));
            },
            onFinish: () => setProcessing(false),
        });
    };

    const columns: ColumnDef<Language>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Language')} />
            ),
            cell: ({ row }) => {
                const language = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <FlagIcon code={language.country_code} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{language.name}</span>
                                {language.is_default && (
                                    <Badge variant="secondary" className="text-xs">
                                        <Star className="h-3 w-3 me-1" />
                                        {t('Default')}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {language.native_name}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'code',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Code')} />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {row.original.code}
                </span>
            ),
        },
        {
            accessorKey: 'country_code',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Country')} />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.country_code}</span>
            ),
        },
        {
            accessorKey: 'is_rtl',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Direction')} />
            ),
            cell: ({ row }) => (
                <Badge variant={row.original.is_rtl ? 'default' : 'outline'}>
                    {row.original.is_rtl ? t('RTL') : t('LTR')}
                </Badge>
            ),
        },
        {
            accessorKey: 'is_active',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => {
                const language = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={language.is_active}
                            onCheckedChange={() => handleToggleStatus(language)}
                            disabled={language.is_default && language.is_active}
                        />
                        <Badge variant={language.is_active ? 'default' : 'secondary'}>
                            {language.is_active ? t('Active') : t('Inactive')}
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const language = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent align="end">
                            <TableActionMenuLabel>{t('Actions')}</TableActionMenuLabel>
                            <TableActionMenuItem onClick={() => handleEdit(language)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t('Edit')}
                            </TableActionMenuItem>
                            <TableActionMenuItem onClick={() => handleToggleStatus(language)}>
                                <ToggleLeft className="me-2 h-4 w-4" />
                                {language.is_active ? t('Deactivate') : t('Activate')}
                            </TableActionMenuItem>
                            {!language.is_default && language.is_active && (
                                <TableActionMenuItem onClick={() => handleSetDefault(language)}>
                                    <Star className="me-2 h-4 w-4" />
                                    {t('Set as Default')}
                                </TableActionMenuItem>
                            )}
                            {!language.is_default && (
                                <>
                                    <TableActionMenuSeparator />
                                    <TableActionMenuItem
                                        variant="destructive"
                                        onClick={() => handleDelete(language)}
                                    >
                                        <Trash2 className="me-2 h-4 w-4" />
                                        {t('Delete')}
                                    </TableActionMenuItem>
                                </>
                            )}
                        </TableActionMenuContent>
                    </TableActionMenu>
                );
            },
        },
    ];

    const renderFormFields = (isEditing: boolean = false) => (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Language Code')}</Label>
                    <div className="relative" ref={localeDropdownRef}>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={localeOpen}
                            className="w-full justify-between"
                            disabled={isEditing}
                            onClick={() => setLocaleOpen(!localeOpen)}
                        >
                            {formData.code ? (
                                <span className="font-mono">{formData.code}</span>
                            ) : (
                                <span className="text-muted-foreground">{t('Select language...')}</span>
                            )}
                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        {localeOpen && (
                            <div className="absolute start-0 top-full z-50 mt-1 w-[200px] rounded-md border bg-popover text-popover-foreground shadow-md">
                                {selectableLocales.length === 0 ? (
                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                        {t('No locales available')}
                                    </div>
                                ) : (
                                    <>
                                        {selectableLocales.length > 5 && (
                                            <div className="p-2">
                                                <Input
                                                    placeholder={t('Search locales...')}
                                                    value={localeSearch}
                                                    onChange={(e) => setLocaleSearch(e.target.value)}
                                                    className="h-8"
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                        <ScrollArea className="max-h-[200px]">
                                            <div className="p-1">
                                                {filteredLocales.length === 0 ? (
                                                    <div className="py-3 text-center text-sm text-muted-foreground">
                                                        {t('No matching locales')}
                                                    </div>
                                                ) : (
                                                    filteredLocales.map((code) => (
                                                        <button
                                                            key={code}
                                                            onClick={() => {
                                                                setFormData((prev) => ({ ...prev, code }));
                                                                setLocaleOpen(false);
                                                                setLocaleSearch('');
                                                            }}
                                                            className={cn(
                                                                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                                                formData.code === code && 'bg-accent'
                                                            )}
                                                        >
                                                            <span className="font-mono flex-1 text-start">{code}</span>
                                                            {formData.code === code && (
                                                                <Check className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t('Available from lang/ directory')}
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>{t('Country Flag')}</Label>
                    <div className="relative" ref={countryDropdownRef}>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={countryOpen}
                            className="w-full justify-between"
                            onClick={() => setCountryOpen(!countryOpen)}
                        >
                            {formData.country_code ? (
                                <span className="flex items-center gap-2">
                                    <FlagIcon code={formData.country_code} className="h-4 w-5" />
                                    {COUNTRIES.find((c) => c.code === formData.country_code)?.name || formData.country_code}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">{t('Select country...')}</span>
                            )}
                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        {countryOpen && (
                            <div className="absolute start-0 top-full z-50 mt-1 w-[300px] rounded-md border bg-popover text-popover-foreground shadow-md">
                                <div className="p-2">
                                    <Input
                                        placeholder={t('Search countries...')}
                                        value={countrySearch}
                                        onChange={(e) => setCountrySearch(e.target.value)}
                                        className="h-8"
                                        autoFocus
                                    />
                                </div>
                                <ScrollArea className="h-[200px]">
                                    <div className="p-1">
                                        {filteredCountries.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                {t('No country found')}
                                            </div>
                                        ) : (
                                            filteredCountries.map((country) => (
                                                <button
                                                    key={country.code}
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, country_code: country.code }));
                                                        setCountryOpen(false);
                                                        setCountrySearch('');
                                                    }}
                                                    className={cn(
                                                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                                        formData.country_code === country.code && 'bg-accent'
                                                    )}
                                                >
                                                    <FlagIcon code={country.code} className="h-4 w-5" />
                                                    <span className="flex-1 text-start">{country.name}</span>
                                                    <span className="text-xs text-muted-foreground">{country.code}</span>
                                                    {formData.country_code === country.code && (
                                                        <Check className="h-4 w-4" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="name">{t('Name')}</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t('e.g. English, Arabic, French')}
                />
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Switch
                        id="is_rtl"
                        checked={formData.is_rtl}
                        onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, is_rtl: checked }))
                        }
                    />
                    <Label htmlFor="is_rtl">{t('Right-to-Left (RTL)')}</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, is_active: checked }))
                        }
                    />
                    <Label htmlFor="is_active">{t('Active')}</Label>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout user={auth.user!} title={t('Languages')}>
            <AdminPageHeader
                title={t('Languages')}
                subtitle={t('Manage supported languages')}
                action={
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 me-2" />
                        {t('Add Language')}
                    </Button>
                }
            />

            {isLoading ? (
                <TableSkeleton
                    columns={skeletonColumns}
                    rows={5}
                    showSearch
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={languages}
                    searchKey="name"
                    searchPlaceholder={t('Search languages...')}
                />
            )}

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Add Language')}</DialogTitle>
                        <DialogDescription>
                            {t('Add a new language to make the application available in multiple languages.')}
                        </DialogDescription>
                    </DialogHeader>
                    {renderFormFields(false)}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submitCreate} disabled={processing || !formData.code}>
                            {processing ? t('Creating...') : t('Create Language')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Edit Language')}</DialogTitle>
                        <DialogDescription>
                            {t('Update language settings and configuration.')}
                        </DialogDescription>
                    </DialogHeader>
                    {renderFormFields(true)}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submitEdit} disabled={processing}>
                            {processing ? t('Saving...') : t('Save Changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Delete Language')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete ":name"? This action cannot be undone.', { name: selectedLanguage?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitDelete}
                            disabled={processing}
                        >
                            {processing ? t('Deleting...') : t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
