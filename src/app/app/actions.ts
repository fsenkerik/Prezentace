"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Všechny akce se spoléhají na RLS: databáze sama pustí učitele jen
 *  k jeho vlastním řádkům, tady se to už nekontroluje podruhé. */

export async function createClass(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const raw = Number(formData.get("student_count"));
  const student_count = Number.isFinite(raw) && raw > 0 ? raw : null;

  const supabase = await supabaseServer();
  await supabase.from("classes").insert({ name, student_count });
  revalidatePath("/app/tridy");
  revalidatePath("/app");
}

export async function deleteClass(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await supabaseServer();
  await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/app/tridy");
}

export async function createSet(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("topic_sets")
    .insert({ title })
    .select("id")
    .single();
  revalidatePath("/app/sady");
  if (data) redirect(`/app/sady/${data.id}`);
}

export async function deleteSet(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await supabaseServer();
  await supabase.from("topic_sets").delete().eq("id", id);
  revalidatePath("/app/sady");
}

/** Hromadné vložení: jeden řádek = jedno téma, volitelně
 *  „Název — popis". Učitel obvykle kopíruje hotový seznam z Wordu. */
export async function addTopics(formData: FormData) {
  const setId = String(formData.get("set_id"));
  const raw = String(formData.get("bulk") ?? "");
  const supabase = await supabaseServer();

  const { data: last } = await supabase
    .from("topics")
    .select("position")
    .eq("set_id", setId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let position = (last?.position ?? -1) + 1;
  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split(/\s+[—–-]\s+/);
      return {
        set_id: setId,
        title: title.trim(),
        description: rest.join(" — ").trim() || null,
        position: position++,
      };
    });

  if (rows.length) await supabase.from("topics").insert(rows);
  revalidatePath(`/app/sady/${setId}`);
}

export async function deleteTopic(formData: FormData) {
  const id = String(formData.get("id"));
  const setId = String(formData.get("set_id"));
  const supabase = await supabaseServer();
  await supabase.from("topics").delete().eq("id", id);
  revalidatePath(`/app/sady/${setId}`);
}

export async function createAssignment(formData: FormData) {
  const set_id = String(formData.get("set_id"));
  const class_id = String(formData.get("class_id"));
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("assignments")
    .insert({ set_id, class_id })
    .select("id")
    .single();
  revalidatePath("/app");
  if (data) redirect(`/app/vyber/${data.id}`);
}

export async function updateAssignment(formData: FormData) {
  const id = String(formData.get("id"));
  const status = formData.get("status");
  const opens = String(formData.get("opens_at") ?? "");
  const closes = String(formData.get("closes_at") ?? "");

  const patch: Record<string, unknown> = {
    show_names: formData.get("show_names") === "on",
    opens_at: opens ? new Date(opens).toISOString() : null,
    closes_at: closes ? new Date(closes).toISOString() : null,
  };
  if (status) patch.status = String(status);

  const supabase = await supabaseServer();
  await supabase.from("assignments").update(patch).eq("id", id);
  revalidatePath(`/app/vyber/${id}`);
  revalidatePath("/app");
}

export async function setStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const supabase = await supabaseServer();
  await supabase.from("assignments").update({ status }).eq("id", id);
  revalidatePath(`/app/vyber/${id}`);
  revalidatePath("/app");
}

/** Uvolnění tématu. Jediná cesta, jak vzít výběr zpět — žák to sám
 *  nesvede, protože volba je z principu konečná. */
export async function releaseSelection(formData: FormData) {
  const id = String(formData.get("id"));
  const assignmentId = String(formData.get("assignment_id"));
  const supabase = await supabaseServer();
  await supabase.from("selections").delete().eq("id", id);
  revalidatePath(`/app/vyber/${assignmentId}`);
}

/** Uvolní všechny výběry v přiřazení naráz — úklid po zkušebním běhu
 *  nebo restart rozdělování. */
export async function releaseAll(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id"));
  const supabase = await supabaseServer();
  await supabase.from("selections").delete().eq("assignment_id", assignmentId);
  revalidatePath(`/app/vyber/${assignmentId}`);
  revalidatePath("/app");
}

export async function assignManually(formData: FormData) {
  const assignment_id = String(formData.get("assignment_id"));
  const topic_id = String(formData.get("topic_id"));
  const name = String(formData.get("student_name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name || !topic_id) return;

  const supabase = await supabaseServer();
  await supabase.from("selections").insert({
    assignment_id,
    topic_id,
    student_name: name,
    name_key: name.toLowerCase(),
    by_teacher: true,
  });
  revalidatePath(`/app/vyber/${assignment_id}`);
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/prihlaseni");
}
