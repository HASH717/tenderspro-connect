import { Facebook, Twitter, Instagram, Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="w-full py-6 mt-auto bg-background border-t">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4">{t("footer.aboutUs")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("footer.aboutUsText")}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">{t("footer.contact")}</h3>
            <div className="space-y-2">
              <a href="mailto:contact@tenderspro.dz" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                <Mail className="w-4 h-4" />
                contact@tenderspro.dz
              </a>
              <a href="tel:+213555555555" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +213 555 555 555
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">{t("footer.followUs")}</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TendersPro. {t("footer.allRightsReserved")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;