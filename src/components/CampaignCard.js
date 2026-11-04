import React from "react";
import { Link } from "react-router-dom";
import { HiLocationMarker } from "react-icons/hi";
import ProgressBar from "./ProgressBar";
import { SaveButton } from "./CampaignActions";
import { useUi } from "../context/UiContext";
import { campaignImage, daysLeft, formatNumber, formatTaka, isEnded, percentFunded } from "../utils/format";

export default function CampaignCard({ campaign }) {
  const { t } = useUi();
  const pct = percentFunded(campaign);
  const ended = isEnded(campaign);
  const days = daysLeft(campaign);

  return (
    <div className="campaign-card-wrap">
      <Link to={`/campaigns/${campaign.id}`} className="card campaign-card">
        <div className="campaign-card__media">
          <img src={campaignImage(campaign)} alt="" loading="lazy" />
          <span className="chip chip--overlay">{t(`category.${campaign.category}`)}</span>
          {pct >= 100 && <span className="badge-funded">{t("card.badgeFunded")}</span>}
        </div>
        <div className="campaign-card__body">
          <h3 className="campaign-card__title">{campaign.title}</h3>
          <p className="campaign-card__summary">{campaign.summary}</p>
          <p className="muted small campaign-card__loc">
            <HiLocationMarker /> {campaign.location}
          </p>
          <ProgressBar value={pct} />
          <div className="campaign-card__stats">
            <div>
              <strong>{formatTaka(campaign.raised)}</strong>
              <span>{t("card.funded", { pct: formatNumber(pct) })}</span>
            </div>
            <div className="text-right">
              <strong>{ended ? t("card.ended") : formatNumber(days)}</strong>
              <span>{ended ? "" : days === 1 ? t("card.dayLeft") : t("card.daysLeft")}</span>
            </div>
          </div>
        </div>
      </Link>
      <SaveButton campaignId={campaign.id} />
    </div>
  );
}
