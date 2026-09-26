"""Blender starter: export only selected prepared meshes/armatures, never clear a scene.

Run inside Blender after saving the source .blend and selecting one prepared asset.
Not executed in the authoring session: Blender MCP was unavailable.
Set OUTPUT to a path in the Golden_Thread_Codex asset directory before execution.
"""
from pathlib import Path
import bpy

OUTPUT = None  # e.g. Path(bpy.data.filepath).parent / "exports" / "traveller.glb"
FORBIDDEN = {"eye", "pupil", "iris", "eyelid", "eyebrow", "lash", "mouth", "nose", "face", "lip"}


def export_selected(output):
    if output is None:
        raise ValueError("Choose an explicit output path; no default export destination.")
    if not bpy.data.filepath:
        raise ValueError("Save the source .blend first.")
    output = Path(output).resolve()
    if output.suffix.lower() != ".glb":
        raise ValueError("Use a .glb output path.")
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite {output}; choose a versioned filename.")
    selected = list(bpy.context.selected_objects)
    meshes = [o for o in selected if o.type == "MESH"]
    if not meshes:
        raise ValueError("Select a prepared mesh asset and its required armature.")
    for obj in meshes:
        if obj.get("part") in FORBIDDEN:
            raise ValueError(f"Forbidden anatomy part on {obj.name}")
        if any(abs(s - 1.0) > 1e-4 for s in obj.scale):
            raise ValueError(f"Apply scale on {obj.name} before export.")
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE" and modifier.object not in selected:
                raise ValueError(f"Select the armature for {obj.name} too.")
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                              export_extras=True, export_animations=True, export_yup=True)
    print(f"Exported {len(meshes)} meshes to {output}. Browser geometry/coverage review still required.")


if __name__ == "__main__":
    export_selected(OUTPUT)
