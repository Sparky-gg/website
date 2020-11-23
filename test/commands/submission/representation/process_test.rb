require 'test_helper'

class Submission::Representation::ProcessTest < ActiveSupport::TestCase
  test "creates submission representation record" do
    submission = create :submission
    ops_status = 200
    ast = "here(lives(an(ast)))"
    ast_digest = Submission::Representation.digest_ast(ast)

    job = create_representer_job!(submission, execution_status: ops_status, ast: ast)
    Submission::Representation::Process.(job)

    representation = submission.reload.submission_representation

    assert_equal ops_status, representation.ops_status
    assert_equal ast_digest, representation.ast_digest
  end

  test "creates exercise representation" do
    ast = "my ast"
    ast_digest = Submission::Representation.digest_ast(ast)
    submission = create :submission
    mapping = { 'foo' => 'bar' }

    job = create_representer_job!(submission, execution_status: 200, ast: ast, mapping: mapping)
    Submission::Representation::Process.(job)

    assert_equal 1, Exercise::Representation.count
    representation = Exercise::Representation.first

    assert_equal submission.exercise, representation.exercise
    assert_equal ast, representation.ast
    assert_equal ast_digest, representation.ast_digest
    assert_equal mapping, representation.mapping
  end

  test "test exercise representations are reused" do
    solution = create :concept_solution
    submission_1 = create :submission, solution: solution
    submission_2 = create :submission, solution: solution
    submission_3 = create :submission, solution: solution

    job_1 = create_representer_job!(submission_1, execution_status: 200, ast: "ast 1")
    job_2 = create_representer_job!(submission_2, execution_status: 200, ast: "ast 1")

    Submission::Representation::Process.(job_1)
    Submission::Representation::Process.(job_2)

    assert_equal 2, Submission::Representation.count
    assert_equal 1, Exercise::Representation.count

    job_3 = create_representer_job!(submission_3, execution_status: 200, ast: "ast 2")
    Submission::Representation::Process.(job_3)
    assert_equal 3, Submission::Representation.count
    assert_equal 2, Exercise::Representation.count
  end

  test "handle ops error" do
    submission = create :submission

    job = create_representer_job!(submission, execution_status: 500, ast: nil)
    Submission::Representation::Process.(job)

    assert submission.reload.representation_exceptioned?
  end

  test "handle approval" do
    ast = "Some AST goes here..."
    exercise = create :concept_exercise
    create :exercise_representation,
      exercise: exercise,
      ast_digest: Submission::Representation.digest_ast(ast),
      action: :approve

    submission = create :submission, exercise: exercise

    job = create_representer_job!(submission, execution_status: 200, ast: ast)
    Submission::Representation::Process.(job)

    assert submission.reload.representation_approved?
  end

  test "handle disapproved" do
    ast = "Some AST goes here..."
    exercise = create :concept_exercise
    create :exercise_representation,
      exercise: exercise,
      ast_digest: Submission::Representation.digest_ast(ast),
      action: :disapprove

    submission = create :submission, exercise: exercise

    job = create_representer_job!(submission, execution_status: 200, ast: ast)
    Submission::Representation::Process.(job)

    assert submission.reload.representation_disapproved?
  end

  test "handle disapproved with comments" do
    mentor = create :user
    feedback = "foobar"

    ast = "Some AST goes here..."
    exercise = create :concept_exercise
    create :exercise_representation,
      exercise: exercise,
      ast_digest: Submission::Representation.digest_ast(ast),
      action: :disapprove,
      feedback_author: mentor,
      feedback_markdown: feedback

    submission = create :submission, exercise: exercise
    job = create_representer_job!(submission, execution_status: 200, ast: ast)
    Submission::Representation::Process.(job)

    assert submission.has_automated_feedback?
  end

  test "handle inconclusive" do
    ast = "Some AST goes here..."
    exercise = create :concept_exercise
    create :exercise_representation,
      exercise: exercise,
      ast_digest: Submission::Representation.digest_ast(ast),
      action: :pending

    submission = create :submission, exercise: exercise
    job = create_representer_job!(submission, execution_status: 200, ast: ast)
    Submission::Representation::Process.(job)

    assert submission.reload.representation_inconclusive?
  end

  test "handle exceptions during processing" do
    ast = "Some AST goes here..."
    exercise = create :concept_exercise
    create :exercise_representation,
      exercise: exercise,
      ast_digest: Submission::Representation.digest_ast(ast),
      action: :disapprove,
      feedback_author: create(:user),
      feedback_markdown: "foobar"

    submission = create :submission, exercise: exercise

    job = create_representer_job!(submission, execution_status: 200, ast: ast)
    cmd = Submission::Representation::Process.new(job)
    cmd.expects(:handle_disapprove!).raises
    cmd.()

    assert submission.reload.representation_exceptioned?
  end

  test "broadcast" do
    ast = "Some AST goes here..."
    exercise = create :concept_exercise
    create :exercise_representation,
      exercise: exercise,
      ast_digest: Submission::Representation.digest_ast(ast),
      action: :approve

    submission = create :submission, exercise: exercise

    SubmissionChannel.expects(:broadcast!).with(submission)
    SubmissionsChannel.expects(:broadcast!).with(submission.solution)

    job = create_representer_job!(submission, execution_status: 200, ast: ast)
    Submission::Representation::Process.(job)
  end
end
