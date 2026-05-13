"use client";

// components/profile/ProfileView.tsx
// Auth-gated profile page. Sections:
//   - Header card with avatar / name / member-since + travel stats
//   - Account (editable name, email, avatar URL)
//   - Travel preferences (default group, hotel tier, dietary, home city)
//   - Recent trips (3 most-recent itineraries with quick actions)
//   - Danger zone (sign out / delete account — mocked)

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { usePreferences, type DietaryPreference, type HotelTier } from "@/lib/usePreferences";
import {
  MOCK_ITINERARIES,
  MOCK_GROUP_TYPES,
  MOCK_DEPARTURE_CITIES,
  formatINR,
  formatINRCompact,
  type GroupType,
} from "@/lib/mockData";
import { toast } from "@/lib/toast";
import {
  CompassIcon,
  WalletIcon,
  MapPinIcon,
  HeartIcon,
  CheckIcon,
  LogOutIcon,
  TrashIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import ItineraryCard from "@/components/cards/ItineraryCard";

const MEMBER_SINCE = "April 2025"; // mock — would come from auth.created_at in real life

const HOTEL_TIERS: { id: HotelTier; label: string; icon: string }[] = [
  { id: "budget", label: "Budget", icon: "🎒" },
  { id: "comfort", label: "Comfort", icon: "🛏️" },
  { id: "premium", label: "Premium", icon: "✨" },
  { id: "luxury", label: "Luxury", icon: "👑" },
];

const DIETARY: { id: DietaryPreference; label: string; icon: string }[] = [
  { id: "none", label: "No restriction", icon: "🍴" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥗" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "jain", label: "Jain", icon: "🪷" },
  { id: "halal", label: "Halal", icon: "🕌" },
];

export default function ProfileView() {
  const router = useRouter();
  const { user, login, logout, hydrated } = useAuth();
  const { prefs, update: updatePrefs, clear: clearPrefs } = usePreferences();

  // Compute travel stats from the mock itinerary set. In a real backend
  // these would be filtered by user_id.
  const stats = useMemo(() => {
    const trips = MOCK_ITINERARIES.length;
    const states = new Set(
      MOCK_ITINERARIES.flatMap((it) =>
        it.state.split(/[·,]/).map((s) => s.trim())
      )
    );
    const totalBudget = MOCK_ITINERARIES.reduce(
      (s, it) => s + it.totalBudget,
      0
    );
    const groupCounts = MOCK_ITINERARIES.reduce(
      (acc, it) => {
        acc[it.groupType] = (acc[it.groupType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const favouriteGroup =
      (Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
        | GroupType
        | undefined) ?? "family";
    return {
      trips,
      placesVisited: states.size,
      totalBudget,
      favouriteGroup,
    };
  }, []);

  const recentTrips = useMemo(
    () =>
      [...MOCK_ITINERARIES]
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
        .slice(0, 3),
    []
  );

  if (!hydrated) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return <SignInPrompt />;
  }

  function handleSaveProfile(patch: { name?: string; email?: string; avatar?: string }) {
    if (!user) return;
    login({ ...user, ...patch });
    toast.success("Profile updated.");
  }

  function handleSignOut() {
    logout();
    toast.success("Signed out. See you soon!");
    router.push("/");
  }

  function handleDelete() {
    const ok = window.confirm(
      "Delete your account? This will clear your saved trips and preferences on this device. (Mock — no backend yet.)"
    );
    if (!ok) return;
    clearPrefs();
    logout();
    toast.success("Account deleted on this device.");
    router.push("/");
  }

  return (
    <div className="bg-cream min-h-[calc(100dvh-4rem)]">
      <ProfileHeader
        user={user}
        memberSince={MEMBER_SINCE}
        onSave={handleSaveProfile}
        favouriteGroup={stats.favouriteGroup}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* Stats */}
        <section>
          <SectionLabel>Travel stats</SectionLabel>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              icon={<CompassIcon size={18} className="text-green-700" />}
              label="Trips planned"
              value={String(stats.trips)}
            />
            <Stat
              icon={<MapPinIcon size={18} className="text-saffron-600" />}
              label="Places explored"
              value={String(stats.placesVisited)}
            />
            <Stat
              icon={<WalletIcon size={18} className="text-green-700" />}
              label="Budget tracked"
              value={formatINRCompact(stats.totalBudget)}
              sub={formatINR(stats.totalBudget)}
            />
            <Stat
              icon={<HeartIcon size={18} className="text-rose-500" />}
              label="Favourite group"
              value={
                MOCK_GROUP_TYPES.find((g) => g.id === stats.favouriteGroup)
                  ?.label ?? "—"
              }
            />
          </div>
        </section>

        {/* Account */}
        <AccountSection user={user} onSave={handleSaveProfile} />

        {/* Preferences */}
        <section>
          <SectionLabel>Travel preferences</SectionLabel>
          <p className="text-sm text-gray-500 mt-1">
            We&apos;ll pre-fill these on Generate and Surprise Me so you can
            skip a few steps.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardLabel>Preferred group</CardLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {MOCK_GROUP_TYPES.map((g) => {
                  const selected = prefs.preferredGroup === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updatePrefs({ preferredGroup: g.id })}
                      className={`text-left rounded-xl border-2 px-3 py-2.5 transition-colors ${
                        selected
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl mr-1.5">{g.emoji}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {g.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardLabel>Preferred hotel tier</CardLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {HOTEL_TIERS.map((t) => {
                  const selected = prefs.hotelTier === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updatePrefs({ hotelTier: t.id })}
                      className={`text-left rounded-xl border-2 px-3 py-2.5 transition-colors ${
                        selected
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl mr-1.5">{t.icon}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardLabel>Dietary</CardLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIETARY.map((d) => {
                  const selected = prefs.dietary === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => updatePrefs({ dietary: d.id })}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                        selected
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span>{d.icon}</span>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardLabel>Home city</CardLabel>
              <select
                value={prefs.fromCity ?? ""}
                onChange={(e) =>
                  updatePrefs({ fromCity: e.target.value || undefined })
                }
                className="mt-2 w-full px-3.5 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              >
                <option value="">Not set</option>
                {MOCK_DEPARTURE_CITIES.map((c) => (
                  <option key={c.airportCode} value={c.city}>
                    {c.city} ({c.airportCode})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Used as the default departure on Generate.
              </p>
            </Card>
          </div>
        </section>

        {/* Recent trips */}
        <section>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <SectionLabel>Recent trips</SectionLabel>
            <Link
              href="/my-itineraries"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              See all
              <ArrowRightIcon size={14} />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTrips.map((it) => (
              <ItineraryCard
                key={it.id}
                itinerary={it}
                variant="grid"
                showFromBadge={false}
              />
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <SectionLabel>Account actions</SectionLabel>
          <div className="mt-3 rounded-2xl bg-white border border-gray-100 p-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold transition-colors"
            >
              <LogOutIcon size={18} />
              Sign out
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition-colors"
            >
              <TrashIcon size={18} />
              Delete account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ProfileHeader({
  user,
  memberSince,
  favouriteGroup,
  onSave,
}: {
  user: { name: string; email: string; avatar?: string };
  memberSince: string;
  favouriteGroup: GroupType;
  onSave: (patch: { avatar?: string }) => void;
}) {
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar ?? "");

  const initial = (user.name || user.email || "S").charAt(0).toUpperCase();
  const groupLabel =
    MOCK_GROUP_TYPES.find((g) => g.id === favouriteGroup)?.label ?? "Traveller";

  return (
    <header className="relative bg-gradient-to-br from-forest-950 via-forest-900 to-green-700 text-white">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.4),_transparent_50%)]" />
      <div className="relative max-w-5xl mx-auto px-4 md:px-8 pt-10 md:pt-14 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          <div className="relative shrink-0">
            <span className="grid place-items-center w-24 h-24 md:w-28 md:h-28 rounded-full bg-white text-green-700 text-4xl font-bold ring-4 ring-white/20 overflow-hidden">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                />
              ) : (
                initial
              )}
            </span>
            <button
              type="button"
              onClick={() => setEditingAvatar((v) => !v)}
              className="absolute -bottom-1 -right-1 grid place-items-center w-9 h-9 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white shadow-card-hover ring-4 ring-forest-950 transition-colors"
              aria-label="Edit avatar"
            >
              <SparklesIcon size={14} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/70">
              {groupLabel} traveller · Member since {memberSince}
            </p>
            <h1 className="mt-1 text-3xl md:text-5xl font-bold tracking-tight">
              {user.name || user.email}
            </h1>
            <p className="mt-1 text-white/80 truncate">{user.email}</p>
          </div>
        </div>

        {editingAvatar && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave({ avatar: avatarUrl.trim() || undefined });
              setEditingAvatar(false);
            }}
            className="mt-5 max-w-lg flex items-center gap-2 animate-slide-down"
          >
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://… (image URL)"
              className="flex-1 px-4 py-2 rounded-full text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-green-300"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setAvatarUrl(user.avatar ?? "");
                setEditingAvatar(false);
              }}
              className="px-3 py-2 text-sm text-white/80 hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Editable account section
// ---------------------------------------------------------------------------

function AccountSection({
  user,
  onSave,
}: {
  user: { name: string; email: string };
  onSave: (patch: { name?: string; email?: string }) => void;
}) {
  return (
    <section className="-mt-12 relative z-10">
      <div className="rounded-2xl bg-white border border-gray-100 shadow-card-hover p-5 md:p-6">
        <SectionLabel>Account</SectionLabel>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <EditableField
            label="Name"
            value={user.name}
            onSave={(name) => onSave({ name })}
            placeholder="Your full name"
          />
          <EditableField
            label="Email"
            value={user.email}
            onSave={(email) => onSave({ email })}
            placeholder="you@example.com"
            type="email"
          />
        </div>
      </div>
    </section>
  );
}

function EditableField({
  label,
  value,
  placeholder,
  type = "text",
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "email";
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    onSave(trimmed);
    setEditing(false);
  }

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </p>
      {editing ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
            className="flex-1 px-3 py-2 text-sm bg-cream border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          />
          <button
            type="button"
            onClick={commit}
            className="grid place-items-center w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 text-white"
            aria-label={`Save ${label}`}
          >
            <CheckIcon size={14} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="mt-1 w-full text-left text-base font-semibold text-gray-900 hover:text-green-700 transition-colors"
        >
          {value || <span className="text-gray-400">Tap to add</span>}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small reusables
// ---------------------------------------------------------------------------

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold tracking-tight text-gray-900">
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5">
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Auth-gated fallback + loading
// ---------------------------------------------------------------------------

function SignInPrompt() {
  return (
    <div className="max-w-md mx-auto px-4 md:px-8 py-20 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-green-50 text-green-700">
        <CompassIcon size={28} />
      </span>
      <h1 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        Sign in to view your profile
      </h1>
      <p className="mt-2 text-gray-500">
        Your travel preferences, saved trips, and stats live behind a quick
        sign-in.
      </p>
      <Link
        href="/auth"
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
      >
        Sign in / Sign up
        <ArrowRightIcon size={16} />
      </Link>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="h-56 bg-gray-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 relative z-10">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

