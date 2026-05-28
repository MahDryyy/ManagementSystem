"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  fetchRoles,
  fetchUsers,
  updateRole,
  updateUser,
} from "@/lib/api/admin";
import { fetchDashboardKeys } from "@/lib/api/auth";
import type { DashboardKeyItem, RoleItem, UserItem } from "@/lib/types/auth";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "roles" | "users";

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("roles");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keys, setKeys] = useState<DashboardKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRoleId, setNewUserRoleId] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, u, k] = await Promise.all([
        fetchRoles(),
        fetchUsers(),
        fetchDashboardKeys(),
      ]);
      setRoles(r);
      setUsers(u);
      setKeys(k);
      setNewUserRoleId((prev) => {
        if (prev !== 0) return prev;
        if (r.length === 0) return 0;
        const nonSuper = r.find((x) => !x.is_superadmin) ?? r[0];
        return nonSuper.id;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_superadmin) load();
  }, [user, load]);

  if (!user?.is_superadmin) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <p className="text-sm text-zinc-500">Hanya superadmin yang dapat mengakses pengaturan ini.</p>
      </div>
    );
  }

  const resetRoleForm = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleKeys([]);
  };

  const startEditRole = (role: RoleItem) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleKeys(role.is_superadmin ? keys.map((k) => k.key) : [...role.dashboard_keys]);
  };

  const toggleRoleKey = (key: string) => {
    setRoleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const saveRole = async () => {
    setMsg(null);
    setError(null);
    try {
      if (editingRoleId) {
        await updateRole(editingRoleId, { name: roleName, dashboard_keys: roleKeys });
        setMsg("Role diperbarui");
      } else {
        await createRole({ name: roleName, dashboard_keys: roleKeys });
        setMsg("Role ditambahkan");
      }
      resetRoleForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan role");
    }
  };

  const removeRole = async (id: number) => {
    if (!confirm("Hapus role ini?")) return;
    try {
      await deleteRole(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus role");
    }
  };

  const addUser = async () => {
    setMsg(null);
    setError(null);
    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        role_id: newUserRoleId,
      });
      setNewUsername("");
      setNewPassword("");
      setMsg("User ditambahkan");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah user");
    }
  };

  const toggleUserActive = async (u: UserItem) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui user");
    }
  };

  const changeUserRole = async (u: UserItem, roleId: number) => {
    try {
      await updateUser(u.id, { role_id: roleId });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui user");
    }
  };

  const resetUserPassword = async (u: UserItem) => {
    const pw = prompt(`Password baru untuk ${u.username}:`);
    if (!pw) return;
    try {
      await updateUser(u.id, { password: pw });
      setMsg(`Password ${u.username} diperbarui`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal reset password");
    }
  };

  const removeUser = async (u: UserItem) => {
    if (!confirm(`Hapus user ${u.username}?`)) return;
    try {
      await deleteUser(u.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus user");
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-6 lg:p-8">
      <h2 className="text-xl font-semibold text-zinc-900">Settings — Admin</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Kelola role, akses dashboard, dan akun pengguna
      </p>

      {msg ? <p className="mt-3 text-sm text-emerald-600">{msg}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex gap-2">
        {(["roles", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t
                ? "bg-cyan-600 text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200"
            }`}
          >
            {t === "roles" ? "Role" : "User"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-zinc-400">Memuat…</p>
      ) : tab === "roles" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold text-zinc-800">
              {editingRoleId ? "Edit role" : "Tambah role"}
            </h3>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Nama role"
              className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
            <p className="mt-4 text-xs font-medium text-zinc-500 uppercase">
              Akses dashboard
            </p>
            <div className="mt-2 space-y-2">
              {keys.map((k) => (
                <label
                  key={k.key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={roleKeys.includes(k.key)}
                    onChange={() => toggleRoleKey(k.key)}
                  />
                  {k.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={saveRole}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white"
              >
                Simpan
              </button>
              {editingRoleId ? (
                <button
                  type="button"
                  onClick={resetRoleForm}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold text-zinc-800">Daftar role</h3>
            <ul className="mt-3 divide-y divide-zinc-100">
              {roles.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-zinc-800">
                      {r.name}
                      {r.is_superadmin ? (
                        <span className="ml-2 text-xs text-amber-600">superadmin</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {r.dashboard_keys.length} dashboard · {r.user_count ?? 0} user
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!r.is_superadmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditRole(r)}
                          className="rounded px-2 py-1 text-xs text-cyan-700 hover:bg-cyan-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRole(r.id)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold text-zinc-800">Tambah user</h3>
            <div className="mt-3 space-y-3">
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password (min. 6)"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
              <select
                value={newUserRoleId}
                onChange={(e) => setNewUserRoleId(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addUser}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white"
              >
                Tambah user
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold text-zinc-800">Daftar user</h3>
            <ul className="mt-3 divide-y divide-zinc-100">
              {users.map((u) => (
                <li key={u.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-800">{u.username}</p>
                      <p className="text-xs text-zinc-500">{u.role_name}</p>
                    </div>
                    <span
                      className={`text-xs ${u.is_active ? "text-emerald-600" : "text-zinc-400"}`}
                    >
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select
                      value={u.role_id}
                      onChange={(e) => changeUserRole(u, Number(e.target.value))}
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleUserActive(u)}
                      className="rounded bg-white px-2 py-1 text-xs text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                    >
                      {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetUserPassword(u)}
                      className="rounded px-2 py-1 text-xs text-cyan-700"
                    >
                      Reset password
                    </button>
                    {u.username !== user.username ? (
                      <button
                        type="button"
                        onClick={() => removeUser(u)}
                        className="rounded px-2 py-1 text-xs text-red-600"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
