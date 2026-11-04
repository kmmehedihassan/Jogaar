import React from "react";
import { Link } from "react-router-dom";
import { HiLocationMarker } from "react-icons/hi";
import ProgressBar from "./ProgressBar";
import { SaveButton } from "./CampaignActions";
import {
  campaignImage,
  daysLeft,
  formatTaka,
  isEnded,
  percentFunded,
} from "../utils/format";

export default function CampaignCard({ campaign }) {
  const pct = percentFunded(campaign);
  const ended = isEnded(campaign);
  const days = daysLeft(campaign);

  return (
    <div className="campaign-card-wrap">
      <Link to={`/campaigns/${campaign.id}`} className="card campaign-card">
        <div className="campaign-card__media">
          <img src={campaignImage(campaign)} alt="" loading="lazy" />
          <span className="chip chip--overlay">{campaign.category}</span>
          {pct >= 100 && <span className="badge-funded">Funded</span>}
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
              <span>{pct}% funded</span>
            </div>
            <div className="text-right">
              <strong>{ended ? "Ended" : days}</strong>
              <span>{ended ? "" : days === 1 ? "day left" : "days left"}</span>
            </div>
          </div>
        </div>
      </Link>
      <SaveButton campaignId={campaign.id} />
    </div>
  );
}
