import { Component } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed
      ? this.props.fallback(() => this.setState({ failed: false }))
      : this.props.children;
  }
}
export default function PublicErrorBoundary({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <Boundary
      key={location.key}
      fallback={(retry) => (
        <section className="patient-shell" role="alert">
          <h1>{t("publicError.title")}</h1>
          <p>{t("publicError.description")}</p>
          <button className="patient-button" onClick={retry}>
            {t("publicError.retry")}
          </button>
          <a href="/home">{t("publicError.home")}</a>
        </section>
      )}
    >
      {children}
    </Boundary>
  );
}
