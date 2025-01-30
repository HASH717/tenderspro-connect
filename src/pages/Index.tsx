import { NotificationDemo } from "@/components/NotificationDemo";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

export default function Index() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationDemo />
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <Input
            type="text"
            placeholder={t('filters.search')}
            className="max-w-md"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('filters.tenderType')}</Label>
              <Select>
                {Object.entries(t('filters.types', { returnObjects: true })).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value as string}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.announcementType')}</Label>
              <Select>
                {Object.entries(t('filters.announcement', { returnObjects: true })).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value as string}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.category')}</Label>
              <Select>
                {Object.entries(t('tender.categories', { returnObjects: true })).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value as string}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.wilaya')}</Label>
              <Select>
                {Object.entries(t('tender.locations', { returnObjects: true })).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value as string}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.publicationDate')}</Label>
              <DatePicker />
            </div>

            <div className="space-y-2">
              <Label>{t('filters.deadlineDate')}</Label>
              <DatePicker />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="microEnterprises" />
            <Label htmlFor="microEnterprises">{t('filters.microEnterprises')}</Label>
          </div>

          <div className="flex space-x-4">
            <Button>{t('filters.searchButton')}</Button>
            <Button variant="outline">{t('filters.clearFilters')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}