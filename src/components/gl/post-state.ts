/**
 * Live levels for the post chain that a scene's camera can drive without re-rendering:
 * depth of field only while the camera travels, bloom eased down on a resting shot.
 * The rig that sets them resets them when its scene unmounts.
 */
export const postState = { dof: 1, bloom: 1 };

export const resetPostState = () => {
  postState.dof = 1;
  postState.bloom = 1;
};
